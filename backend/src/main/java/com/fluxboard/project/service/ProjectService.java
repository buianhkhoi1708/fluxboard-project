package com.fluxboard.project.service;

import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.dto.request.CreateProjectRequest;
import com.fluxboard.project.dto.request.UpdateProjectRequest;
import com.fluxboard.project.dto.response.ProjectBoardOverviewResponse;
import com.fluxboard.project.dto.response.ProjectOverviewResponse;
import com.fluxboard.project.dto.response.ProjectResponse;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProjectService
        implements CrudService<ProjectResponse, String, CreateProjectRequest, UpdateProjectRequest> {

    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository,
            TaskRepository taskRepository,
            UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ProjectResponse create(CreateProjectRequest request) {
        return create(request, null);
    }

    public ProjectResponse create(CreateProjectRequest request, String ownerUserId) {
        String normalizedOwnerId = requireAuthenticatedUserId(ownerUserId);
        validateUserExists(normalizedOwnerId, "Owner user does not exist.");

        ProjectEntity entity = new ProjectEntity();
        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(normalizedOwnerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));

        return toResponse(projectRepository.save(entity));
    }

    @Override
    public ProjectResponse getById(String id) {
        return toResponse(findProjectById(id));
    }

    @Override
    public Page<ProjectResponse> getPage(Pageable pageable) {
        return projectRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<ProjectResponse> getPageByDepartment(String departmentId, Pageable pageable) {
        return projectRepository.findByDepartmentIdAndDeletedFalse(TextUtils.trim(departmentId), pageable)
                .map(this::toResponse);
    }

    public ProjectOverviewResponse getOverview(String projectId) {
        ProjectEntity project = findProjectById(TextUtils.trim(projectId));
        List<BoardEntity> boards = boardRepository.findByProjectIdAndDeletedFalse(project.getId());

        boards.sort(
                Comparator.comparing(BoardEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
        );

        List<String> boardIds = boards.stream()
                .map(BoardEntity::getId)
                .toList();

        Map<String, List<BoardColumnResponse>> columnsByBoardId;
        if (boardIds.isEmpty()) {
            columnsByBoardId = Map.of();
        } else {
            List<BoardColumnEntity> boardColumns = boardColumnRepository
                    .findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds);

            columnsByBoardId = boardColumns.stream()
                    .collect(Collectors.groupingBy(
                            BoardColumnEntity::getBoardId,
                            Collectors.mapping(this::toBoardColumnResponse, Collectors.toList())
                    ));
        }

        List<ProjectBoardOverviewResponse> boardOverviews = boards.stream()
                .map(board -> new ProjectBoardOverviewResponse(
                        toBoardResponse(board),
                        columnsByBoardId.getOrDefault(board.getId(), List.of())
                ))
                .toList();

        return new ProjectOverviewResponse(toResponse(project), boardOverviews);
    }

    @Override
    public ProjectResponse update(String id, UpdateProjectRequest request) {
        ProjectEntity entity = findProjectById(id);
        String ownerId = TextUtils.trim(request.ownerId());
        validateUserExists(ownerId, "Owner user does not exist.");

        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(ownerId);
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));

        return toResponse(projectRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        ProjectEntity entity = findProjectById(id);
        List<BoardEntity> boards = boardRepository.findByProjectIdAndDeletedFalse(entity.getId());

        if (!boards.isEmpty()) {
            List<String> boardIds = boards.stream()
                    .map(BoardEntity::getId)
                    .toList();

            List<BoardColumnEntity> boardColumns = boardColumnRepository
                    .findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds);

            if (!boardColumns.isEmpty()) {
                List<String> columnIds = boardColumns.stream()
                        .map(BoardColumnEntity::getId)
                        .toList();

                List<TaskEntity> tasks = taskRepository.findByColumnIdInAndDeletedFalse(columnIds);
                for (TaskEntity task : tasks) {
                    task.markDeleted();
                }
                taskRepository.saveAll(tasks);

                for (BoardColumnEntity boardColumn : boardColumns) {
                    boardColumn.markDeleted();
                }
                boardColumnRepository.saveAll(boardColumns);
            }

            for (BoardEntity board : boards) {
                board.markDeleted();
            }
            boardRepository.saveAll(boards);
        }

        entity.markDeleted();
        projectRepository.save(entity);
    }

    public ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private String requireAuthenticatedUserId(String ownerUserId) {
        String normalizedOwnerUserId = TextUtils.trimToNull(ownerUserId);
        if (normalizedOwnerUserId == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user is required.");
        }
        return normalizedOwnerUserId;
    }

    private void validateUserExists(String userId, String message) {
        if (!userRepository.existsByIdAndDeletedFalse(userId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, message);
        }
    }

    private ProjectResponse toResponse(ProjectEntity entity) {
        return new ProjectResponse(
                entity.getId(),
                entity.getName(),
                entity.getOwnerId(),
                entity.getDepartmentId(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private BoardResponse toBoardResponse(BoardEntity entity) {
        return new BoardResponse(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private BoardColumnResponse toBoardColumnResponse(BoardColumnEntity entity) {
        return new BoardColumnResponse(
                entity.getId(),
                entity.getBoardId(),
                entity.getName(),
                entity.getOrder(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
