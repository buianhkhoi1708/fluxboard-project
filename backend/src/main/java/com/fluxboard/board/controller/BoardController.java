package com.fluxboard.board.controller;

import com.fluxboard.board.dto.request.CreateBoardRequest;
import com.fluxboard.board.dto.request.UpdateBoardRequest;
import com.fluxboard.board.dto.response.BoardDetailResponse;
import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.service.BoardService;
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
@RequestMapping("/boards")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @RequirePermission("BOARD_CREATE")
    @PostMapping
    public ResponseEntity<ApiResponse<BoardResponse>> createBoard(@Valid @RequestBody CreateBoardRequest request) {
        return ResponseFactory.created("Board created successfully.", boardService.create(request));
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<BoardResponse>>> getBoards(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BoardResponse> page = boardService.getPage(pageable);
        return ResponseFactory.paged("Boards retrieved successfully.", page);
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping("/{boardId}")
    public ResponseEntity<ApiResponse<BoardDetailResponse>> getBoardById(@PathVariable String boardId) {
        return ResponseFactory.ok("Board detail retrieved successfully.", boardService.getDetailById(boardId));
    }

    @RequirePermission("BOARD_VIEW")
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<BoardResponse>>> getBoardsByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BoardResponse> page = boardService.getPageByProject(projectId, pageable);
        return ResponseFactory.paged("Project boards retrieved successfully.", page);
    }

    @RequirePermission("BOARD_UPDATE")
    @PutMapping("/{boardId}")
    public ResponseEntity<ApiResponse<BoardResponse>> updateBoard(
            @PathVariable String boardId,
            @Valid @RequestBody UpdateBoardRequest request) {
        return ResponseFactory.ok("Board updated successfully.", boardService.update(boardId, request));
    }

    @RequirePermission("BOARD_DELETE")
    @DeleteMapping("/{boardId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoard(@PathVariable String boardId) {
        boardService.delete(boardId);
        return ResponseFactory.ok("Board deleted successfully.");
    }
}
