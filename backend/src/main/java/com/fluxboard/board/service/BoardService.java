package com.fluxboard.board.service;

import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.column.service.BoardColumnService;
import com.fluxboard.board.dto.request.CreateBoardRequest;
import com.fluxboard.board.dto.request.UpdateBoardRequest;
import com.fluxboard.board.dto.response.BoardColumnDetailResponse;
import com.fluxboard.board.dto.response.BoardDetailResponse;
import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.dto.response.BoardTaskDetailResponse;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.enums.TaskPriority;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class BoardService implements CrudService<BoardResponse, String, CreateBoardRequest, UpdateBoardRequest> {

    private static final Comparator<TaskEntity> TASK_ORDER_COMPARATOR = Comparator
            .comparingInt(TaskEntity::getOrder)
            .thenComparing(TaskEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()));

    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;
    private final BoardColumnService boardColumnService;
    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;
    private final ApplicationEventPublisher eventPublisher;

    public BoardService(
            BoardRepository boardRepository,
            ProjectRepository projectRepository,
            BoardColumnService boardColumnService,
            BoardColumnRepository boardColumnRepository,
            TaskRepository taskRepository,
            ApplicationEventPublisher eventPublisher) {
        this.boardRepository = boardRepository;
        this.projectRepository = projectRepository;
        this.boardColumnService = boardColumnService;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public BoardResponse create(CreateBoardRequest request) {
        return create(request, null);
    }

    public BoardResponse create(CreateBoardRequest request, String actorUserId) {
        String projectId = TextUtils.trim(request.projectId());
        findProjectById(projectId);
        String name = TextUtils.trim(request.name());

        if (boardRepository.existsByProjectIdAndNameAndDeletedFalse(projectId, name)) {
            throw new AppException(ErrorCode.CONFLICT, "Board name already exists in this project.");
        }

        BoardEntity entity = new BoardEntity();
        entity.setProjectId(projectId);
        entity.setName(name);

        BoardEntity saved = boardRepository.save(entity);
        boardColumnService.initializeDefaultColumns(saved.getId());
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.BOARD, saved.getId(), saved.getProjectId(), saved.getId(), null,
                actorUserId, ActivityAction.CREATE, null, null, null,
                "Board created: " + saved.getName()
        ));
        return toResponse(saved);
    }

    @Override
    public BoardResponse getById(String id) {
        return toResponse(findBoardById(id));
    }

    public BoardDetailResponse getDetailById(String id) {
        BoardEntity board = findBoardById(id);
        List<BoardColumnEntity> columns = boardColumnRepository
                .findByBoardIdAndDeletedFalseOrderByOrderAsc(board.getId());
        List<String> columnIds = columns.stream()
                .map(BoardColumnEntity::getId)
                .toList();

        List<TaskEntity> tasks = columnIds.isEmpty()
                ? List.of()
                : taskRepository.findByColumnIdInAndDeletedFalse(columnIds);
        tasks.sort(TASK_ORDER_COMPARATOR);

        Map<String, TaskEntity> taskById = new HashMap<>();
        for (TaskEntity task : tasks) {
            taskById.put(task.getId(), task);
        }

        Map<String, List<TaskEntity>> childrenByParentId = new HashMap<>();
        Map<String, List<TaskEntity>> rootTasksByColumnId = new HashMap<>();

        for (TaskEntity task : tasks) {
            String parentTaskId = TextUtils.trimToNull(task.getParentTaskId());
            if (parentTaskId == null || !taskById.containsKey(parentTaskId)) {
                rootTasksByColumnId.computeIfAbsent(task.getColumnId(), k -> new ArrayList<>()).add(task);
                continue;
            }
            childrenByParentId.computeIfAbsent(parentTaskId, k -> new ArrayList<>()).add(task);
        }

        for (List<TaskEntity> children : childrenByParentId.values()) {
            children.sort(TASK_ORDER_COMPARATOR);
        }
        for (List<TaskEntity> roots : rootTasksByColumnId.values()) {
            roots.sort(TASK_ORDER_COMPARATOR);
        }

        List<BoardColumnDetailResponse> columnResponses = columns.stream()
                .map(column -> new BoardColumnDetailResponse(
                        column.getId(),
                        column.getName(),
                        column.getOrder(),
                        rootTasksByColumnId.getOrDefault(column.getId(), List.of())
                                .stream()
                                .map(task -> toTaskDetailResponse(task, childrenByParentId))
                                .toList()))
                .toList();

        return new BoardDetailResponse(
                board.getId(),
                board.getProjectId(),
                board.getName(),
                columnResponses);
    }

    @Override
    public Page<BoardResponse> getPage(Pageable pageable) {
        return boardRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<BoardResponse> getPageByProject(String projectId, Pageable pageable) {
        findProjectById(TextUtils.trim(projectId));
        return boardRepository
                .findByProjectIdAndDeletedFalse(TextUtils.trim(projectId), pageable)
                .map(this::toResponse);
    }

    @Override
    public BoardResponse update(String id, UpdateBoardRequest request) {
        return update(id, request, null);
    }

    public BoardResponse update(String id, UpdateBoardRequest request, String actorUserId) {
        BoardEntity entity = findBoardById(id);
        String normalizedName = TextUtils.trim(request.name());

        if (boardRepository.existsByProjectIdAndNameAndIdNotAndDeletedFalse(
                entity.getProjectId(),
                normalizedName,
                id)) {
            throw new AppException(ErrorCode.CONFLICT, "Board name already exists in this project.");
        }

        String oldName = entity.getName();
        entity.setName(normalizedName);
        BoardEntity saved = boardRepository.save(entity);
        String changedField = !oldName.equals(saved.getName()) ? "name" : null;
        if (changedField != null) {
            eventPublisher.publishEvent(new ActivityCreatedEvent(
                    this, ActivitySource.BOARD, saved.getId(), saved.getProjectId(), saved.getId(), null,
                    actorUserId, ActivityAction.UPDATE, changedField, oldName, saved.getName(),
                    "Board updated: " + saved.getName()
            ));
        }

        return toResponse(saved);
    }

    @Override
    public void delete(String id) {
        delete(id, null);
    }

    public void delete(String id, String actorUserId) {
        BoardEntity entity = findBoardById(id);
        String boardName = entity.getName();
        entity.markDeleted();
        boardRepository.save(entity);
        boardColumnService.softDeleteByBoardId(entity.getId());

        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.BOARD, entity.getId(), entity.getProjectId(), entity.getId(), null,
                actorUserId, ActivityAction.DELETE, null, null, null,
                "Board deleted: " + boardName
        ));
    }

    private BoardEntity findBoardById(String boardId) {
        BoardEntity board = boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));

        if (!projectRepository.existsByIdAndDeletedFalse(board.getProjectId())) {
            throw new AppException(ErrorCode.NOT_FOUND, "Board not found.");
        }

        return board;
    }

    private ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(TextUtils.trim(projectId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private BoardTaskDetailResponse toTaskDetailResponse(
            TaskEntity task,
            Map<String, List<TaskEntity>> childrenByParentId) {
        List<BoardTaskDetailResponse> subtasks = childrenByParentId.getOrDefault(task.getId(), List.of())
                .stream()
                .map(child -> toTaskDetailResponse(child, childrenByParentId))
                .toList();

        return new BoardTaskDetailResponse(
                task.getId(),
                task.getOrder(),
                task.getTitle(),
                task.getDescription(),
                task.getAssigneesUserId() == null ? List.of() : List.copyOf(task.getAssigneesUserId()),
                formatPriority(task.getPriority()),
                formatDate(task.getStartDate()),
                formatDate(task.getDueDate()),
                calculateEstimatedDays(task.getStartDate(), task.getEstimatedDate()),
                task.getStoryPoint(),
                task.getAiSuggestedPoint(),
                task.getAiEstimatedReason(),
                task.getStatus(),
                subtasks);
    }

    private String formatPriority(TaskPriority priority) {
        if (priority == null) {
            return null;
        }
        String lower = priority.name().toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private String formatDate(Instant value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneOffset.UTC).toLocalDate().toString();
    }

    private Integer calculateEstimatedDays(Instant startDate, Instant estimatedDate) {
        if (startDate == null || estimatedDate == null) {
            return null;
        }

        long days = ChronoUnit.DAYS.between(
                startDate.atZone(ZoneOffset.UTC).toLocalDate(),
                estimatedDate.atZone(ZoneOffset.UTC).toLocalDate());

        if (days < 0) {
            return null;
        }
        return Math.toIntExact(days);
    }

    private BoardResponse toResponse(BoardEntity entity) {
        return new BoardResponse(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
