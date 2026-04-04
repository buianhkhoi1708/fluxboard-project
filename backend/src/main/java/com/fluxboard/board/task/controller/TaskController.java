package com.fluxboard.board.task.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.board.task.dto.request.CreateTaskRequest;
import com.fluxboard.board.task.dto.request.UpdateTaskRequest;
import com.fluxboard.board.task.dto.response.TaskResponse;
import com.fluxboard.board.task.service.TaskService;
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
@RequestMapping("/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(@Valid @RequestBody CreateTaskRequest request) {
        return ResponseFactory.created("Task created successfully.", taskService.create(request));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPage(pageable);
        return ResponseFactory.paged("Tasks retrieved successfully.", page);
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTaskById(@PathVariable String taskId) {
        return ResponseFactory.ok("Task retrieved successfully.", taskService.getById(taskId));
    }

    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByProject(projectId, pageable);
        return ResponseFactory.paged("Project tasks retrieved successfully.", page);
    }

    @GetMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByBoard(
            @PathVariable String boardId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByBoard(boardId, pageable);
        return ResponseFactory.paged("Board tasks retrieved successfully.", page);
    }

    @GetMapping("/columns/{columnId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByColumn(
            @PathVariable String columnId,
            @PageableDefault(size = 20, sort = "position", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByColumn(columnId, pageable);
        return ResponseFactory.paged("Column tasks retrieved successfully.", page);
    }

    @GetMapping("/columns/{columnId}/ordered")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getOrderedTasksByColumn(@PathVariable String columnId) {
        return ResponseFactory.ok("Column tasks retrieved successfully.", taskService.getByColumnIdOrdered(columnId));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        return ResponseFactory.ok("Task updated successfully.", taskService.update(taskId, request));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable String taskId) {
        taskService.delete(taskId);
        return ResponseFactory.ok("Task deleted successfully.");
    }
}
