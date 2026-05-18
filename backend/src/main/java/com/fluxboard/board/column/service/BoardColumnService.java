package com.fluxboard.board.column.service;

import com.fluxboard.board.column.dto.request.CreateBoardColumnRequest;
import com.fluxboard.board.column.dto.request.UpdateBoardColumnRequest;
import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.task.service.TaskService;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.repository.ProjectRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class BoardColumnService
        implements CrudService<BoardColumnResponse, String, CreateBoardColumnRequest, UpdateBoardColumnRequest> {

    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;
    private final TaskService taskService;

    public BoardColumnService(
            BoardColumnRepository boardColumnRepository,
            BoardRepository boardRepository,
            ProjectRepository projectRepository,
            TaskService taskService
    ) {
        this.boardColumnRepository = boardColumnRepository;
        this.boardRepository = boardRepository;
        this.projectRepository = projectRepository;
        this.taskService = taskService;
    }

    @Override
    public BoardColumnResponse create(CreateBoardColumnRequest request) {
        String boardId = TextUtils.trim(request.boardId());
        findBoardById(boardId);
        String name = TextUtils.trim(request.name());

        if (boardColumnRepository.existsByBoardIdAndNameAndDeletedFalse(boardId, name)) {
            throw new AppException(ErrorCode.CONFLICT, "Column name already exists in this board.");
        }

        int targetOrder = nextOrder(boardId);

        BoardColumnEntity entity = new BoardColumnEntity();
        entity.setBoardId(boardId);
        entity.setName(name);
        entity.setOrder(targetOrder);

        return toResponse(boardColumnRepository.save(entity));
    }

    @Override
    public BoardColumnResponse getById(String id) {
        return toResponse(findBoardColumnById(id));
    }

    @Override
    public Page<BoardColumnResponse> getPage(Pageable pageable) {
        return boardColumnRepository.findByDeletedFalse(pageable).map(this::toResponse);
    }

    public Page<BoardColumnResponse> getPageByBoard(String boardId, Pageable pageable) {
        findBoardById(TextUtils.trim(boardId));
        return boardColumnRepository.findByBoardIdAndDeletedFalse(TextUtils.trim(boardId), pageable)
                .map(this::toResponse);
    }

    public List<BoardColumnResponse> getByBoardIdOrdered(String boardId) {
        findBoardById(TextUtils.trim(boardId));
        return boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(boardId))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public BoardColumnResponse update(String id, UpdateBoardColumnRequest request) {
        BoardColumnEntity entity = findBoardColumnById(id);
        String boardId = entity.getBoardId();
        String name = TextUtils.trim(request.name());

        if (boardColumnRepository.existsByBoardIdAndNameAndIdNotAndDeletedFalse(boardId, name, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Column name already exists in this board.");
        }

        int currentOrder = entity.getOrder();
        int targetOrder = resolveUpdateOrder(boardId, request.order(), currentOrder);
        if (targetOrder != currentOrder) {
            moveInsideBoard(boardId, currentOrder, targetOrder, entity.getId());
        }

        entity.setName(name);
        entity.setOrder(targetOrder);

        return toResponse(boardColumnRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        BoardColumnEntity entity = findBoardColumnById(id);
        int currentOrder = entity.getOrder();
        String boardId = entity.getBoardId();
        taskService.softDeleteByColumnId(entity.getId());

        entity.markDeleted();
        boardColumnRepository.save(entity);

        shiftOrdersAfterDelete(boardId, currentOrder, entity.getId());
    }

    public void initializeDefaultColumns(String boardId, boolean isAiBoard) {
        // Nếu là AI Board, không làm gì cả, để cho luồng AI tự tạo cột
        if (isAiBoard) {
            return;
        }

        List<BoardColumnEntity> existing = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (!existing.isEmpty()) {
            return;
        }

        BoardColumnEntity todo = new BoardColumnEntity();
        todo.setBoardId(boardId);
        todo.setName("to do");
        todo.setOrder(1);

        BoardColumnEntity doing = new BoardColumnEntity();
        doing.setBoardId(boardId);
        doing.setName("doing");
        doing.setOrder(2);

        BoardColumnEntity done = new BoardColumnEntity();
        done.setBoardId(boardId);
        done.setName("done");
        done.setOrder(3);

        boardColumnRepository.saveAll(List.of(todo, doing, done));
    }

    public void softDeleteByBoardId(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (columns.isEmpty()) {
            return;
        }

        for (BoardColumnEntity column : columns) {
            taskService.softDeleteByColumnId(column.getId());
            column.markDeleted();
        }
        boardColumnRepository.saveAll(columns);
    }

    private BoardColumnEntity findBoardColumnById(String columnId) {
        BoardColumnEntity column = boardColumnRepository.findByIdAndDeletedFalse(columnId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board column not found."));
        findBoardById(column.getBoardId());
        return column;
    }

    private BoardEntity findBoardById(String boardId) {
        BoardEntity board = boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));

        if (!projectRepository.existsByIdAndDeletedFalse(board.getProjectId())) {
            throw new AppException(ErrorCode.NOT_FOUND, "Board not found.");
        }

        return board;
    }

    private int resolveUpdateOrder(String boardId, Integer requestedOrder, int currentOrder) {
        if (requestedOrder == null) {
            return currentOrder;
        }
        int maxOrder = Math.max(listSize(boardId), 1);
        return Math.min(Math.max(requestedOrder, 1), maxOrder);
    }

    private int nextOrder(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (columns.isEmpty()) {
            return 1;
        }
        return columns.get(columns.size() - 1).getOrder() + 1;
    }

    private int listSize(String boardId) {
        return boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId).size();
    }

    private void shiftOrdersAfterDelete(String boardId, int fromOrder, String exceptId) {
        List<BoardColumnEntity> columns = boardColumnRepository
                .findByBoardIdAndDeletedFalseAndOrderGreaterThanOrderByOrderAsc(boardId, fromOrder);
        for (BoardColumnEntity column : columns) {
            if (exceptId != null && exceptId.equals(column.getId())) {
                continue;
            }
            column.setOrder(column.getOrder() - 1);
        }
        boardColumnRepository.saveAll(columns);
    }

    private void moveInsideBoard(String boardId, int currentOrder, int targetOrder, String columnId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        for (BoardColumnEntity column : columns) {
            if (columnId.equals(column.getId())) {
                continue;
            }

            int order = column.getOrder();
            if (targetOrder > currentOrder) {
                if (order > currentOrder && order <= targetOrder) {
                    column.setOrder(order - 1);
                }
            } else if (order >= targetOrder && order < currentOrder) {
                column.setOrder(order + 1);
            }
        }
        boardColumnRepository.saveAll(columns);
    }

    private BoardColumnResponse toResponse(BoardColumnEntity entity) {
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
