package com.fluxboard.board.column.controller;

import com.fluxboard.board.column.dto.request.CreateBoardColumnRequest;
import com.fluxboard.board.column.dto.request.UpdateBoardColumnRequest;
import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import com.fluxboard.board.column.service.BoardColumnService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.annotation.RequirePermission;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/board-columns")
public class BoardColumnController {

    private final BoardColumnService boardColumnService;

    public BoardColumnController(BoardColumnService boardColumnService) {
        this.boardColumnService = boardColumnService;
    }

    @RequirePermission("BOARD_COLUMN_MANAGE")
    @PostMapping
    public ResponseEntity<ApiResponse<BoardColumnResponse>> createBoardColumn(
            @Valid @RequestBody CreateBoardColumnRequest request
    ) {
        return ResponseFactory.created("Board column created successfully.", boardColumnService.create(request));
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<BoardColumnResponse>>> getBoardColumns(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<BoardColumnResponse> page = boardColumnService.getPage(pageable);
        return ResponseFactory.paged("Board columns retrieved successfully.", page);
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping("/{columnId}")
    public ResponseEntity<ApiResponse<BoardColumnResponse>> getBoardColumnById(@PathVariable String columnId) {
        return ResponseFactory.ok("Board column retrieved successfully.", boardColumnService.getById(columnId));
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<List<BoardColumnResponse>>> getBoardColumnsByBoard(
            @PathVariable String boardId,
            @PageableDefault(size = 20, sort = "order", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<BoardColumnResponse> page = boardColumnService.getPageByBoard(boardId, pageable);
        return ResponseFactory.paged("Board columns of board retrieved successfully.", page);
    }

    @RequirePermission("BOARD_COLUMN_MANAGE")
    @PutMapping("/{columnId}")
    public ResponseEntity<ApiResponse<BoardColumnResponse>> updateBoardColumn(
            @PathVariable String columnId,
            @Valid @RequestBody UpdateBoardColumnRequest request
    ) {
        return ResponseFactory.ok("Board column updated successfully.", boardColumnService.update(columnId, request));
    }

    @RequirePermission("BOARD_COLUMN_MANAGE")
    @DeleteMapping("/{columnId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoardColumn(@PathVariable String columnId) {
        boardColumnService.delete(columnId);
        return ResponseFactory.ok("Board column deleted successfully.");
    }
}
