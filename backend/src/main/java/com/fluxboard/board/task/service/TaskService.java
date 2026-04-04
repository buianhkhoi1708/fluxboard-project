package com.fluxboard.board.task.service;

import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.dto.request.CreateTaskRequest;
import com.fluxboard.board.task.dto.request.UpdateTaskRequest;
import com.fluxboard.board.task.dto.response.TaskResponse;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class TaskService implements CrudService<TaskResponse, String, CreateTaskRequest, UpdateTaskRequest> {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final UserRepository userRepository;

    public TaskService(
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository,
            UserRepository userRepository
    ) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.userRepository = userRepository;
    }

    @Override
    public TaskResponse create(CreateTaskRequest request) {
        String projectId = TextUtils.trim(request.projectId());
        findProjectById(projectId);

        String boardId = TextUtils.trim(request.boardId());
        BoardEntity board = findBoardById(boardId);
        if (!projectId.equals(board.getProjectId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Board must belong to the same project.");
        }

        String listId = TextUtils.trim(request.listId());
        BoardColumnEntity column = findBoardColumnById(listId);
        if (!boardId.equals(column.getBoardId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Board column must belong to the same board.");
        }

        String taskCode = TextUtils.trim(request.taskCode());
        if (taskRepository.existsByProjectIdAndTaskCodeAndDeletedFalse(projectId, taskCode)) {
            throw new AppException(ErrorCode.CONFLICT, "Task code already exists in this project.");
        }

        String reporterUserId = TextUtils.trim(request.reporterUserId());
        validateUserExists(reporterUserId, "Reporter user does not exist.");

        List<String> assigneeIds = normalizeIdList(request.assigneeIds());
        validateUsersExist(assigneeIds, "Assignee user does not exist: ");

        String parentTaskId = TextUtils.trimToNull(request.parentTaskId());
        validateParentTask(parentTaskId, projectId, null);

        int targetPosition = resolveCreatePosition(listId, request.position());
        shiftPositionsForInsert(listId, targetPosition, null);

        TaskEntity entity = new TaskEntity();
        entity.setTaskCode(taskCode);
        entity.setProjectId(projectId);
        entity.setBoardId(boardId);
        entity.setListId(listId);
        entity.setSprintId(TextUtils.trimToNull(request.sprintId()));
        entity.setParentTaskId(parentTaskId);
        entity.setReporterUserId(reporterUserId);
        entity.setAssigneeIds(assigneeIds);
        entity.setLabelIds(normalizeIdList(request.labelIds()));
        entity.setStatus(TextUtils.trim(request.status()));
        entity.setPriority(TextUtils.trim(request.priority()));
        entity.setPosition(targetPosition);

        return toResponse(taskRepository.save(entity));
    }

    @Override
    public TaskResponse getById(String id) {
        return toResponse(findTaskById(id));
    }

    @Override
    public Page<TaskResponse> getPage(Pageable pageable) {
        return taskRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<TaskResponse> getPageByProject(String projectId, Pageable pageable) {
        findProjectById(TextUtils.trim(projectId));
        return taskRepository.findByProjectIdAndDeletedFalse(TextUtils.trim(projectId), pageable).map(this::toResponse);
    }

    public Page<TaskResponse> getPageByBoard(String boardId, Pageable pageable) {
        findBoardById(TextUtils.trim(boardId));
        return taskRepository.findByBoardIdAndDeletedFalse(TextUtils.trim(boardId), pageable).map(this::toResponse);
    }

    public Page<TaskResponse> getPageByColumn(String columnId, Pageable pageable) {
        findBoardColumnById(TextUtils.trim(columnId));
        return taskRepository.findByListIdAndDeletedFalse(TextUtils.trim(columnId), pageable).map(this::toResponse);
    }

    public List<TaskResponse> getByColumnIdOrdered(String columnId) {
        findBoardColumnById(TextUtils.trim(columnId));
        return taskRepository.findByListIdAndDeletedFalseOrderByPositionAsc(TextUtils.trim(columnId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public TaskResponse update(String id, UpdateTaskRequest request) {
        TaskEntity entity = findTaskById(id);
        String projectId = entity.getProjectId();

        String boardId = TextUtils.trim(request.boardId());
        BoardEntity board = findBoardById(boardId);
        if (!projectId.equals(board.getProjectId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Board must belong to the same project.");
        }

        String listId = TextUtils.trim(request.listId());
        BoardColumnEntity column = findBoardColumnById(listId);
        if (!boardId.equals(column.getBoardId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Board column must belong to the same board.");
        }

        String taskCode = TextUtils.trim(request.taskCode());
        if (taskRepository.existsByProjectIdAndTaskCodeAndIdNotAndDeletedFalse(projectId, taskCode, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Task code already exists in this project.");
        }

        String reporterUserId = TextUtils.trim(request.reporterUserId());
        validateUserExists(reporterUserId, "Reporter user does not exist.");

        List<String> assigneeIds = normalizeIdList(request.assigneeIds());
        validateUsersExist(assigneeIds, "Assignee user does not exist: ");

        String parentTaskId = TextUtils.trimToNull(request.parentTaskId());
        validateParentTask(parentTaskId, projectId, id);

        String currentListId = entity.getListId();
        int currentPosition = entity.getPosition();
        boolean sameList = currentListId.equals(listId);
        int targetPosition = resolveUpdatePosition(listId, request.position(), sameList ? currentPosition : null);

        if (sameList) {
            if (targetPosition != currentPosition) {
                moveInsideList(listId, currentPosition, targetPosition, entity.getId());
            }
        } else {
            shiftPositionsForInsert(listId, targetPosition, null);
            shiftPositionsAfterDelete(currentListId, currentPosition, entity.getId());
        }

        entity.setTaskCode(taskCode);
        entity.setBoardId(boardId);
        entity.setListId(listId);
        entity.setSprintId(TextUtils.trimToNull(request.sprintId()));
        entity.setParentTaskId(parentTaskId);
        entity.setReporterUserId(reporterUserId);
        entity.setAssigneeIds(assigneeIds);
        entity.setLabelIds(normalizeIdList(request.labelIds()));
        entity.setStatus(TextUtils.trim(request.status()));
        entity.setPriority(TextUtils.trim(request.priority()));
        entity.setPosition(targetPosition);

        return toResponse(taskRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        TaskEntity entity = findTaskById(id);
        int currentPosition = entity.getPosition();
        String listId = entity.getListId();

        entity.markDeleted();
        taskRepository.save(entity);

        shiftPositionsAfterDelete(listId, currentPosition, entity.getId());
    }

    public void softDeleteByBoardId(String boardId) {
        List<TaskEntity> tasks = taskRepository.findByBoardIdAndDeletedFalse(TextUtils.trim(boardId));
        if (tasks.isEmpty()) {
            return;
        }

        for (TaskEntity task : tasks) {
            task.markDeleted();
        }
        taskRepository.saveAll(tasks);
    }

    public void softDeleteByColumnId(String columnId) {
        List<TaskEntity> tasks = taskRepository.findByListIdAndDeletedFalseOrderByPositionAsc(TextUtils.trim(columnId));
        if (tasks.isEmpty()) {
            return;
        }

        for (TaskEntity task : tasks) {
            task.markDeleted();
        }
        taskRepository.saveAll(tasks);
    }

    private TaskEntity findTaskById(String taskId) {
        return taskRepository.findByIdAndDeletedFalse(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
    }

    private ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private BoardEntity findBoardById(String boardId) {
        return boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));
    }

    private BoardColumnEntity findBoardColumnById(String columnId) {
        return boardColumnRepository.findByIdAndDeletedFalse(columnId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board column not found."));
    }

    private void validateParentTask(String parentTaskId, String projectId, String selfTaskId) {
        if (parentTaskId == null) {
            return;
        }

        if (selfTaskId != null && selfTaskId.equals(parentTaskId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Task cannot be parent of itself.");
        }

        TaskEntity parentTask = taskRepository.findByIdAndDeletedFalse(parentTaskId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Parent task does not exist."));
        if (!projectId.equals(parentTask.getProjectId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Parent task must belong to the same project.");
        }
    }

    private void validateUserExists(String userId, String message) {
        if (!userRepository.existsByIdAndDeletedFalse(userId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, message);
        }
    }

    private void validateUsersExist(List<String> userIds, String prefixMessage) {
        for (String userId : userIds) {
            if (!userRepository.existsByIdAndDeletedFalse(userId)) {
                throw new AppException(ErrorCode.BAD_REQUEST, prefixMessage + userId);
            }
        }
    }

    private List<String> normalizeIdList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        Set<String> unique = new LinkedHashSet<>();
        for (String value : values) {
            String normalized = TextUtils.trimToNull(value);
            if (normalized != null) {
                unique.add(normalized);
            }
        }

        return new ArrayList<>(unique);
    }

    private int resolveCreatePosition(String listId, Integer requestedPosition) {
        int appendPosition = nextPosition(listId);
        if (requestedPosition == null) {
            return appendPosition;
        }
        return Math.min(Math.max(requestedPosition, 1), appendPosition);
    }

    private int resolveUpdatePosition(String listId, Integer requestedPosition, Integer currentPositionIfSameList) {
        if (requestedPosition == null) {
            if (currentPositionIfSameList != null) {
                return currentPositionIfSameList;
            }
            return nextPosition(listId);
        }

        int maxPosition = currentPositionIfSameList != null
                ? Math.max(listSize(listId), 1)
                : nextPosition(listId);

        return Math.min(Math.max(requestedPosition, 1), maxPosition);
    }

    private int nextPosition(String listId) {
        List<TaskEntity> tasks = taskRepository.findByListIdAndDeletedFalseOrderByPositionAsc(listId);
        if (tasks.isEmpty()) {
            return 1;
        }
        return tasks.get(tasks.size() - 1).getPosition() + 1;
    }

    private int listSize(String listId) {
        return taskRepository.findByListIdAndDeletedFalseOrderByPositionAsc(listId).size();
    }

    private void shiftPositionsForInsert(String listId, int fromPosition, String exceptId) {
        List<TaskEntity> tasks = taskRepository
                .findByListIdAndDeletedFalseAndPositionGreaterThanEqualOrderByPositionAsc(listId, fromPosition);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) {
                continue;
            }
            task.setPosition(task.getPosition() + 1);
        }
        taskRepository.saveAll(tasks);
    }

    private void shiftPositionsAfterDelete(String listId, int fromPosition, String exceptId) {
        List<TaskEntity> tasks = taskRepository
                .findByListIdAndDeletedFalseAndPositionGreaterThanOrderByPositionAsc(listId, fromPosition);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) {
                continue;
            }
            task.setPosition(task.getPosition() - 1);
        }
        taskRepository.saveAll(tasks);
    }

    private void moveInsideList(String listId, int currentPosition, int targetPosition, String taskId) {
        List<TaskEntity> tasks = taskRepository.findByListIdAndDeletedFalseOrderByPositionAsc(listId);
        for (TaskEntity task : tasks) {
            if (taskId.equals(task.getId())) {
                continue;
            }

            int position = task.getPosition();
            if (targetPosition > currentPosition) {
                if (position > currentPosition && position <= targetPosition) {
                    task.setPosition(position - 1);
                }
            } else if (position >= targetPosition && position < currentPosition) {
                task.setPosition(position + 1);
            }
        }
        taskRepository.saveAll(tasks);
    }

    private TaskResponse toResponse(TaskEntity entity) {
        return new TaskResponse(
                entity.getId(),
                entity.getTaskCode(),
                entity.getProjectId(),
                entity.getBoardId(),
                entity.getListId(),
                entity.getSprintId(),
                entity.getParentTaskId(),
                entity.getReporterUserId(),
                entity.getAssigneeIds() == null ? List.of() : List.copyOf(entity.getAssigneeIds()),
                entity.getLabelIds() == null ? List.of() : List.copyOf(entity.getLabelIds()),
                entity.getStatus(),
                entity.getPriority(),
                entity.getPosition(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
