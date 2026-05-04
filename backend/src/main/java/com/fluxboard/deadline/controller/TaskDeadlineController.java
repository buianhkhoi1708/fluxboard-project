package com.fluxboard.deadline.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.deadline.service.TaskDeadlineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskDeadlineController {
    
    private final TaskDeadlineService deadlineService;

    private String getCurrentUserId() {
        var request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        AuthenticatedUser user = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);
        return user.userId();
    }

    @PutMapping("/{taskId}/deadline")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDeadlineConfig(
            @PathVariable String taskId,
            @RequestBody DeadlineConfigRequest request) {
        Map<String, Object> result = deadlineService.updateDeadlineConfig(
                taskId, getCurrentUserId(), request.startDate(), request.dueDate(), request.reminderOffset(), request.extensionLimit()
        );
        return ResponseFactory.ok("Deadline configuration updated successfully.", result);
    }

    @PutMapping("/{taskId}/complete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> completeTask(@PathVariable String taskId) {
        Map<String, Object> result = deadlineService.completeTaskKPI(taskId, getCurrentUserId());
        return ResponseFactory.ok("Task completed.", result);
    }

    // 1. API: Nhân viên xin dời hạn
    @PostMapping("/{taskId}/deadline/extensions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestExtension(
            @PathVariable String taskId,
            @RequestBody ExtensionRequest request) {
        Map<String, Object> result = deadlineService.requestExtension(taskId, getCurrentUserId(), request.requestedDueDate(), request.reason());
        return ResponseFactory.ok("Extension requested successfully. Pending manager approval.", result);
    }

    // 2. API: Quản lý phê duyệt yêu cầu dời hạn
    @PostMapping("/{taskId}/deadline/extensions/approve")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approveExtension(@PathVariable String taskId) {
        Map<String, Object> result = deadlineService.approveExtension(taskId, getCurrentUserId());
        return ResponseFactory.ok("Deadline extension approved successfully.", result);
    }

    // 3. API: Quản lý từ chối yêu cầu dời hạn
    @PostMapping("/{taskId}/deadline/extensions/reject")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectExtension(
            @PathVariable String taskId,
            @RequestBody RejectExtensionRequest request) {
        Map<String, Object> result = deadlineService.rejectExtension(taskId, getCurrentUserId(), request.reason());
        return ResponseFactory.ok("Deadline extension request rejected.", result);
    }

    public record DeadlineConfigRequest(
            @JsonProperty("start_date") Instant startDate,
            @JsonProperty("due_date") Instant dueDate,
            @JsonProperty("reminder_offset") Integer reminderOffset,
            @JsonProperty("extension_limit") Integer extensionLimit
    ) {}

    public record ExtensionRequest(
            @JsonProperty("requested_due_date") Instant requestedDueDate,
            String reason
    ) {}

    public record RejectExtensionRequest(
            String reason
    ) {}
}