package com.fluxboard.deadline.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.deadline.service.TaskDeadlineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskDeadlineController {
    private final TaskDeadlineService deadlineService;

    public TaskDeadlineController(TaskDeadlineService deadlineService) {
        this.deadlineService = deadlineService;
    }

    private String getCurrentUserId() {
        var request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        AuthenticatedUser user = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);
        return user.userId();
    }

    @PutMapping("/{task_id}/complete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> completeTask(@PathVariable("task_id") String taskId) {
        Map<String, Object> result = deadlineService.completeTaskKPI(taskId, getCurrentUserId());
        return ResponseFactory.ok("Task completed.", result);
    }

    @PostMapping("/{task_id}/deadline/extensions")
    public ResponseEntity<ApiResponse<Void>> extendDeadline(
            @PathVariable("task_id") String taskId,
            @RequestBody ExtensionRequest request) {
        deadlineService.extendDeadline(taskId, getCurrentUserId(), request.newDueDate(), request.reason());
        return ResponseFactory.ok("Deadline extended successfully.", null);
    }
    
    public record ExtensionRequest(Instant newDueDate, String reason) {}
}