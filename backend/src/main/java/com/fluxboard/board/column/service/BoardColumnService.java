package com.fluxboard.board.column.service;

import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.column.dto.request.CreateBoardColumnRequest;
import com.fluxboard.board.column.dto.request.UpdateBoardColumnRequest;
import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.service.TaskService;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class BoardColumnService
        implements CrudService<BoardColumnResponse, String, CreateBoardColumnRequest, UpdateBoardColumnRequest> {

    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final TaskService taskService;

    public BoardColumnService(
            BoardColumnRepository boardColumnRepository,
            BoardRepository boardRepository,
            TaskService taskService
    ) {
        this.boardColumnRepository = boardColumnRepository;
        this.boardRepository = boardRepository;
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

        int targetPosition = request.position() != null ? request.position() : nextPosition(boardId);
        shiftPositionsForInsert(boardId, targetPosition, null);

        boolean doneColumn = Boolean.TRUE.equals(request.isDoneColumn());
        if (doneColumn) {
            clearDoneColumn(boardId, null);
        }

        BoardColumnEntity entity = new BoardColumnEntity();
        entity.setBoardId(boardId);
        entity.setName(name);
        entity.setPosition(targetPosition);
        entity.setDoneColumn(doneColumn);

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
        return boardColumnRepository.findByBoardIdAndDeletedFalseOrderByPositionAsc(TextUtils.trim(boardId))
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

        int currentPosition = entity.getPosition();
        int targetPosition = request.position() != null ? request.position() : currentPosition;
        if (targetPosition != currentPosition) {
            shiftPositionsForInsert(boardId, targetPosition, entity.getId());
            shiftPositionsAfterDelete(boardId, currentPosition, entity.getId());
        }

        boolean doneColumn = request.isDoneColumn() != null
                ? request.isDoneColumn()
                : entity.isDoneColumn();
        if (doneColumn) {
            clearDoneColumn(boardId, entity.getId());
        }

        entity.setName(name);
        entity.setPosition(targetPosition);
        entity.setDoneColumn(doneColumn);

        return toResponse(boardColumnRepository.save(entity));
    }

    @Override
    public void delete(String id) {
        BoardColumnEntity entity = findBoardColumnById(id);
        int position = entity.getPosition();
        String boardId = entity.getBoardId();
        taskService.softDeleteByColumnId(entity.getId());

        entity.markDeleted();
        entity.setDoneColumn(false);
        boardColumnRepository.save(entity);

        shiftPositionsAfterDelete(boardId, position, entity.getId());
    }

    public void initializeDefaultColumns(String boardId) {
        List<BoardColumnEntity> existing = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByPositionAsc(boardId);
        if (!existing.isEmpty()) {
            return;
        }

        BoardColumnEntity todo = new BoardColumnEntity();
        todo.setBoardId(boardId);
        todo.setName("to do");
        todo.setPosition(1);
        todo.setDoneColumn(false);

        BoardColumnEntity doing = new BoardColumnEntity();
        doing.setBoardId(boardId);
        doing.setName("doing");
        doing.setPosition(2);
        doing.setDoneColumn(false);

        BoardColumnEntity done = new BoardColumnEntity();
        done.setBoardId(boardId);
        done.setName("done");
        done.setPosition(3);
        done.setDoneColumn(true);

        boardColumnRepository.saveAll(List.of(todo, doing, done));
    }

    public void softDeleteByBoardId(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByPositionAsc(boardId);
        if (columns.isEmpty()) {
            return;
        }

        for (BoardColumnEntity column : columns) {
            taskService.softDeleteByColumnId(column.getId());
            column.markDeleted();
            column.setDoneColumn(false);
        }
        boardColumnRepository.saveAll(columns);
    }

    private BoardColumnEntity findBoardColumnById(String columnId) {
        return boardColumnRepository.findByIdAndDeletedFalse(columnId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board column not found."));
    }

    private BoardEntity findBoardById(String boardId) {
        return boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));
    }

    private int nextPosition(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByPositionAsc(boardId);
        if (columns.isEmpty()) {
            return 1;
        }
        return columns.get(columns.size() - 1).getPosition() + 1;
    }

    private void shiftPositionsForInsert(String boardId, int fromPosition, String exceptId) {
        List<BoardColumnEntity> columns = boardColumnRepository
                .findByBoardIdAndDeletedFalseAndPositionGreaterThanEqualOrderByPositionAsc(boardId, fromPosition);
        for (BoardColumnEntity column : columns) {
            if (exceptId != null && exceptId.equals(column.getId())) {
                continue;
            }
            column.setPosition(column.getPosition() + 1);
        }
        boardColumnRepository.saveAll(columns);
    }

    private void shiftPositionsAfterDelete(String boardId, int fromPosition, String exceptId) {
        List<BoardColumnEntity> columns = boardColumnRepository
                .findByBoardIdAndDeletedFalseAndPositionGreaterThanOrderByPositionAsc(boardId, fromPosition);
        for (BoardColumnEntity column : columns) {
            if (exceptId != null && exceptId.equals(column.getId())) {
                continue;
            }
            column.setPosition(column.getPosition() - 1);
        }
        boardColumnRepository.saveAll(columns);
    }

    private void clearDoneColumn(String boardId, String exceptId) {
        List<BoardColumnEntity> doneColumns = boardColumnRepository.findByBoardIdAndDeletedFalseAndDoneColumnTrue(boardId);
        for (BoardColumnEntity doneColumn : doneColumns) {
            if (exceptId != null && exceptId.equals(doneColumn.getId())) {
                continue;
            }
            doneColumn.setDoneColumn(false);
        }
        boardColumnRepository.saveAll(doneColumns);
    }

    private BoardColumnResponse toResponse(BoardColumnEntity entity) {
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
