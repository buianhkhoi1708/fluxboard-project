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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BoardColumnService implements CrudService<BoardColumnResponse, String, CreateBoardColumnRequest, UpdateBoardColumnRequest> {
    private final BoardColumnRepository boardColumnRepository;
    private final BoardRepository boardRepository;
    private final ProjectRepository projectRepository;
    private final TaskService taskService;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardColumnService(
            BoardColumnRepository boardColumnRepository,
            BoardRepository boardRepository,
            ProjectRepository projectRepository,
            TaskService taskService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.boardColumnRepository = boardColumnRepository;
        this.boardRepository = boardRepository;
        this.projectRepository = projectRepository;
        this.taskService = taskService;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public BoardColumnResponse create(CreateBoardColumnRequest request) {
        String boardId = TextUtils.trim(request.boardId());
        BoardEntity board = findBoardById(boardId);
        String name = TextUtils.trim(request.name());

        if (boardColumnRepository.existsByBoardIdAndNameAndDeletedFalse(boardId, name)) {
            throw new AppException(ErrorCode.CONFLICT, "Column name already exists in this board.");
        }

        int targetOrder = nextOrder(boardId);

        BoardColumnEntity entity = new BoardColumnEntity();
        entity.setBoardId(boardId);
        entity.setName(name);
        entity.setOrder(targetOrder);

        BoardColumnEntity saved = boardColumnRepository.save(entity);
        BoardColumnResponse response = toResponse(saved);
        broadcastColumnChange("COLUMN_CREATED", board, saved, null, saved.getOrder());
        return response;
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
        return boardColumnRepository.findByBoardIdAndDeletedFalse(TextUtils.trim(boardId), pageable).map(this::toResponse);
    }

    public List<BoardColumnResponse> getByBoardIdOrdered(String boardId) {
        findBoardById(TextUtils.trim(boardId));
        return boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(boardId)).stream().map(this::toResponse).toList();
    }

    @Override
    public BoardColumnResponse update(String id, UpdateBoardColumnRequest request) {
        BoardColumnEntity entity = findBoardColumnById(id);
        BoardEntity board = findBoardById(entity.getBoardId());
        String boardId = entity.getBoardId();
        String name = TextUtils.trim(request.name());

        if (boardColumnRepository.existsByBoardIdAndNameAndIdNotAndDeletedFalse(boardId, name, id)) {
            throw new AppException(ErrorCode.CONFLICT, "Column name already exists in this board.");
        }

        int currentOrder = entity.getOrder();
        int targetOrder = resolveUpdateOrder(boardId, request.order(), currentOrder);
        if (targetOrder != currentOrder) moveInsideBoard(boardId, currentOrder, targetOrder, entity.getId());

        entity.setName(name);
        entity.setOrder(targetOrder);

        BoardColumnEntity saved = boardColumnRepository.save(entity);
        BoardColumnResponse response = toResponse(saved);
        broadcastColumnChange("COLUMN_UPDATED", board, saved, currentOrder, saved.getOrder());
        return response;
    }

    @Override
    public void delete(String id) {
        BoardColumnEntity entity = findBoardColumnById(id);
        BoardEntity board = findBoardById(entity.getBoardId());
        int currentOrder = entity.getOrder();
        String boardId = entity.getBoardId();

        taskService.softDeleteByColumnId(entity.getId());
        entity.markDeleted();
        boardColumnRepository.save(entity);
        shiftOrdersAfterDelete(boardId, currentOrder, entity.getId());
        broadcastColumnChange("COLUMN_DELETED", board, entity, currentOrder, null);
    }

    public void initializeDefaultColumns(String boardId, boolean isAiBoard) {
        if (isAiBoard) return;

        List<BoardColumnEntity> existing = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (!existing.isEmpty()) return;

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
        broadcastBoardOnly("COLUMNS_INITIALIZED", boardId, null);
    }

    public void softDeleteByBoardId(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (columns.isEmpty()) return;

        for (BoardColumnEntity column : columns) {
            taskService.softDeleteByColumnId(column.getId());
            column.markDeleted();
        }

        boardColumnRepository.saveAll(columns);
        broadcastBoardOnly("BOARD_COLUMNS_DELETED", boardId, null);
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
        if (requestedOrder == null) return currentOrder;
        int maxOrder = Math.max(listSize(boardId), 1);
        return Math.min(Math.max(requestedOrder, 1), maxOrder);
    }

    private int nextOrder(String boardId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        if (columns.isEmpty()) return 1;
        return columns.get(columns.size() - 1).getOrder() + 1;
    }

    private int listSize(String boardId) {
        return boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId).size();
    }

    private void shiftOrdersAfterDelete(String boardId, int fromOrder, String exceptId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseAndOrderGreaterThanOrderByOrderAsc(boardId, fromOrder);
        for (BoardColumnEntity column : columns) {
            if (exceptId != null && exceptId.equals(column.getId())) continue;
            column.setOrder(column.getOrder() - 1);
        }
        boardColumnRepository.saveAll(columns);
    }

    private void moveInsideBoard(String boardId, int currentOrder, int targetOrder, String columnId) {
        List<BoardColumnEntity> columns = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        for (BoardColumnEntity column : columns) {
            if (columnId.equals(column.getId())) continue;

            int order = column.getOrder();
            if (targetOrder > currentOrder) {
                if (order > currentOrder && order <= targetOrder) column.setOrder(order - 1);
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

    private void broadcastColumnChange(String action, BoardEntity board, BoardColumnEntity column, Integer oldOrder, Integer newOrder) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("action", action);
        payload.put("type", action);
        payload.put("board_id", column.getBoardId());
        payload.put("project_id", board.getProjectId());
        payload.put("column_id", column.getId());
        payload.put("old_order", oldOrder);
        payload.put("new_order", newOrder);
        payload.put("timestamp", Instant.now());
        payload.put("column", toResponse(column));

        messagingTemplate.convertAndSend("/topic/board/" + column.getBoardId(), payload);
        messagingTemplate.convertAndSend("/topic/boards/" + column.getBoardId(), payload);
        messagingTemplate.convertAndSend("/topic/system", payload);
    }

    private void broadcastBoardOnly(String action, String boardId, String projectId) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("action", action);
        payload.put("type", action);
        payload.put("board_id", boardId);
        payload.put("project_id", projectId);
        payload.put("timestamp", Instant.now());

        messagingTemplate.convertAndSend("/topic/board/" + boardId, payload);
        messagingTemplate.convertAndSend("/topic/boards/" + boardId, payload);
        messagingTemplate.convertAndSend("/topic/system", payload);
    }
}
