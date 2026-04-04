package com.fluxboard.project.service;

import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
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
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ProjectService
        implements CrudService<ProjectResponse, String, CreateProjectRequest, UpdateProjectRequest> {

    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;

    public ProjectService(
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository
    ) {
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
    }

    @Override
    public ProjectResponse create(CreateProjectRequest request) {
        // String code = normalizeText(request.code());
        // if (projectRepository.existsByCodeAndDeletedFalse(code)) {
        // throw new AppException(ErrorCode.CONFLICT, "Project code already exists.");
        // }

        if (StringUtils.hasText(request.defaultBoardId())) {
            throw new AppException(
                    ErrorCode.BAD_REQUEST,
                    "defaultBoardId is not allowed when creating project. Set it in update after board is created.");
        }

        ProjectEntity entity = new ProjectEntity();
        // entity.setCode(code);
        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(TextUtils.trim(request.ownerId()));
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));
        entity.setDefaultBoardId(null);

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
                Comparator.comparing(BoardEntity::isDefaultBoard).reversed()
                        .thenComparing(BoardEntity::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
        );

        List<String> boardIds = boards.stream()
                .map(BoardEntity::getId)
                .toList();

        Map<String, List<BoardColumnResponse>> columnsByBoardId;
        if (boardIds.isEmpty()) {
            columnsByBoardId = Map.of();
        } else {
            List<BoardColumnEntity> boardColumns = boardColumnRepository
                    .findByBoardIdInAndDeletedFalseOrderByBoardIdAscPositionAsc(boardIds);

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
        // String code = normalizeText(request.code());
        // if (projectRepository.existsByCodeAndIdNotAndDeletedFalse(code, id)) {
        // throw new AppException(ErrorCode.CONFLICT, "Project code already exists.");
        // }

        // entity.setCode(code);
        entity.setName(TextUtils.trim(request.name()));
        entity.setOwnerId(TextUtils.trim(request.ownerId()));
        entity.setDepartmentId(TextUtils.trim(request.departmentId()));
        entity.setStatus(TextUtils.trim(request.status()));

        String defaultBoardId = TextUtils.trimToNull(request.defaultBoardId());
        if (defaultBoardId != null) {
            validateDefaultBoard(defaultBoardId, entity.getId());
        }
        entity.setDefaultBoardId(defaultBoardId);

        return toResponse(projectRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        ProjectEntity entity = findProjectById(id);
        entity.markDeleted();
        entity.setDefaultBoardId(null);
        projectRepository.save(entity);
    }

    public ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private void validateDefaultBoard(String boardId, String projectId) {
        BoardEntity board = boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Default board does not exist."));

        if (!projectId.equals(board.getProjectId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Default board must belong to the same project.");
        }
    }

    private ProjectResponse toResponse(ProjectEntity entity) {
        return new ProjectResponse(
                entity.getId(),
                // entity.getCode(),
                entity.getName(),
                entity.getOwnerId(),
                entity.getDepartmentId(),
                entity.getDefaultBoardId(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private BoardResponse toBoardResponse(BoardEntity entity) {
        return new BoardResponse(
                entity.getId(),
                entity.getProjectId(),
                entity.getName(),
                entity.getType(),
                entity.isDefaultBoard(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private BoardColumnResponse toBoardColumnResponse(BoardColumnEntity entity) {
        return new BoardColumnResponse(
                entity.getId(),
                entity.getBoardId(),
                entity.getName(),
                entity.getPosition(),
                entity.isDoneColumn(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
