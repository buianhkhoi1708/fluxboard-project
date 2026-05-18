package com.fluxboard.board.task.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.board.task.dto.request.CreateTaskRequest;
import com.fluxboard.board.task.dto.request.TaskMoveRequest;
import com.fluxboard.board.task.dto.request.UpdateTaskRequest;
import com.fluxboard.board.task.dto.response.TaskResponse;
import com.fluxboard.board.task.service.TaskService;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
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

    @RequirePermission("TASK_CREATE")
    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @Valid @RequestBody CreateTaskRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        return ResponseFactory.created("Task created successfully.", taskService.create(request, authUser.userId()));
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPage(pageable);
        return ResponseFactory.paged("Tasks retrieved successfully.", page);
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTaskById(@PathVariable String taskId) {
        return ResponseFactory.ok("Task retrieved successfully.", taskService.getById(taskId));
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByProject(projectId, pageable);
        return ResponseFactory.paged("Project tasks retrieved successfully.", page);
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByBoard(
            @PathVariable String boardId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByBoard(boardId, pageable);
        return ResponseFactory.paged("Board tasks retrieved successfully.", page);
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping("/columns/{columnId}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksByColumn(
            @PathVariable String columnId,
            @PageableDefault(size = 20, sort = "order", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<TaskResponse> page = taskService.getPageByColumn(columnId, pageable);
        return ResponseFactory.paged("Column tasks retrieved successfully.", page);
    }

    @RequirePermission("TASK_VIEW")
    @GetMapping("/columns/{columnId}/ordered")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getOrderedTasksByColumn(@PathVariable String columnId) {
        return ResponseFactory.ok("Column tasks retrieved successfully.", taskService.getByColumnIdOrdered(columnId));
    }

    @RequirePermission("TASK_UPDATE")
    @PutMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            @PathVariable String taskId,
            @Valid @RequestBody UpdateTaskRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        return ResponseFactory.ok("Task updated successfully.", taskService.update(taskId, request, authUser.userId()));
    }

    @RequirePermission("TASK_UPDATE")
    @PatchMapping("/{taskId}/move")
    public ResponseEntity<ApiResponse<TaskResponse>> moveTask(
            @PathVariable String taskId,
            @Valid @RequestBody TaskMoveRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        TaskResponse response = taskService.moveTask(taskId, request, authUser.userId());
        return ResponseFactory.ok("Task moved successfully.", response);
    }

    @RequirePermission("TASK_DELETE")
    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable String taskId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        taskService.delete(taskId, authUser.userId());
        return ResponseFactory.ok("Task deleted successfully.");
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getMyTasks(
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        List<TaskResponse> myTasks = taskService.getMyTasks(authUser.userId());
        return ResponseFactory.ok("Fetched My Tasks successfully.", myTasks);
    }
}
