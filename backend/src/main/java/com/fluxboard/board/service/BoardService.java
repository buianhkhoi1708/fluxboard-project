package com.fluxboard.board.service;

import com.fluxboard.board.dto.request.CreateBoardRequest;
import com.fluxboard.board.dto.request.UpdateBoardRequest;
import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.column.service.BoardColumnService;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class BoardService implements CrudService<BoardResponse, String, CreateBoardRequest, UpdateBoardRequest> {

    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;
    private final BoardColumnService boardColumnService;

    public BoardService(
            BoardRepository boardRepository,
            ProjectRepository projectRepository,
            BoardColumnService boardColumnService
    ) {
        this.boardRepository = boardRepository;
        this.projectRepository = projectRepository;
        this.boardColumnService = boardColumnService;
    }

    @Override
    public BoardResponse create(CreateBoardRequest request) {
        String projectId = TextUtils.trim(request.projectId());
        ProjectEntity project = findProjectById(projectId);
        String name = TextUtils.trim(request.name());
        String type = TextUtils.trim(request.type());

        if (boardRepository.existsByProjectIdAndNameAndDeletedFalse(projectId, name)) {
            throw new AppException(ErrorCode.CONFLICT, "Board name already exists in this project.");
        }

        BoardEntity entity = new BoardEntity();
        entity.setProjectId(projectId);
        entity.setName(name);
        entity.setType(type);
        entity.setDefaultBoard(Boolean.TRUE.equals(request.isDefault()));

        if (entity.isDefaultBoard()) {
            clearDefaultBoard(projectId, null);
        }

        BoardEntity saved = boardRepository.save(entity);

        if (saved.isDefaultBoard()) {
            project.setDefaultBoardId(saved.getId());
            projectRepository.save(project);
        }

        boardColumnService.initializeDefaultColumns(saved.getId());

        return toResponse(saved);
    }

    @Override
    public BoardResponse getById(String id) {
        return toResponse(findBoardById(id));
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
        BoardEntity entity = findBoardById(id);
        ProjectEntity project = findProjectById(entity.getProjectId());
        String normalizedName = TextUtils.trim(request.name());
        String normalizedType = TextUtils.trim(request.type());

        if (boardRepository.existsByProjectIdAndNameAndIdNotAndDeletedFalse(
                entity.getProjectId(),
                normalizedName,
                id
        )) {
            throw new AppException(ErrorCode.CONFLICT, "Board name already exists in this project.");
        }

        entity.setName(normalizedName);
        entity.setType(normalizedType);
        entity.setDefaultBoard(Boolean.TRUE.equals(request.isDefault()));

        if (entity.isDefaultBoard()) {
            clearDefaultBoard(entity.getProjectId(), entity.getId());
        }

        BoardEntity saved = boardRepository.save(entity);

        if (saved.isDefaultBoard()) {
            project.setDefaultBoardId(saved.getId());
            projectRepository.save(project);
        } else if (saved.getId().equals(project.getDefaultBoardId())) {
            project.setDefaultBoardId(null);
            projectRepository.save(project);
        }

        return toResponse(saved);
    }

    @Override
    public void delete(String id) {
        BoardEntity entity = findBoardById(id);
        ProjectEntity project = findProjectById(entity.getProjectId());
        entity.markDeleted();
        entity.setDefaultBoard(false);
        boardRepository.save(entity);

        if (entity.getId().equals(project.getDefaultBoardId())) {
            project.setDefaultBoardId(null);
            projectRepository.save(project);
        }

        boardColumnService.softDeleteByBoardId(entity.getId());
    }

    private BoardEntity findBoardById(String boardId) {
        return boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));
    }

    private void clearDefaultBoard(String projectId, String exceptBoardId) {
        List<BoardEntity> boards = boardRepository.findByProjectIdAndDeletedFalse(projectId);
        for (BoardEntity board : boards) {
            if (exceptBoardId != null && exceptBoardId.equals(board.getId())) {
                continue;
            }
            if (board.isDefaultBoard()) {
                board.setDefaultBoard(false);
                boardRepository.save(board);
            }
        }
    }

    private ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(TextUtils.trim(projectId))
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private BoardResponse toResponse(BoardEntity entity) {
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
}
