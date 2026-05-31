package com.fluxboard.deadline.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.deadline.service.TaskDeadlineService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class TaskDeadlineController {
    private final TaskDeadlineService deadlineService;

    private String getCurrentUserId(HttpServletRequest request) {
        Object directUserId = request.getAttribute("userId");
        if (directUserId != null) return String.valueOf(directUserId);

        AuthenticatedUser user = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);
        return user.userId();
    }

    @GetMapping({"/deadlines/task/{taskId}", "/tasks/{taskId}/deadline"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDeadlineByTask(@PathVariable String taskId) {
        return ResponseFactory.ok("Deadline fetched successfully.", deadlineService.getDeadlineByTask(taskId));
    }

    @PutMapping("/tasks/{taskId}/deadline")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDeadlineConfig(
            @PathVariable String taskId,
            @RequestBody DeadlineConfigRequest body,
            HttpServletRequest request
    ) {
        Map<String, Object> result = deadlineService.updateDeadlineConfig(
                taskId,
                getCurrentUserId(request),
                body.startDate(),
                body.dueDate(),
                body.reminderOffset(),
                body.extensionLimit()
        );

        return ResponseFactory.ok("Deadline configuration updated successfully.", result);
    }

    @PutMapping("/tasks/{taskId}/complete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> completeTask(
            @PathVariable String taskId,
            HttpServletRequest request
    ) {
        return ResponseFactory.ok("Task completed.", deadlineService.completeTaskKPI(taskId, getCurrentUserId(request)));
    }

    @PostMapping({"/deadlines/task/{taskId}/extend", "/tasks/{taskId}/deadline/extensions"})
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestExtension(
            @PathVariable String taskId,
            @RequestBody ExtensionRequest body,
            HttpServletRequest request
    ) {
        Instant newDueDate = body.newDueDate() != null ? body.newDueDate() : body.requestedDueDate();

        Map<String, Object> result = deadlineService.requestExtension(
                taskId,
                getCurrentUserId(request),
                newDueDate,
                body.reason()
        );

        return ResponseFactory.ok("Extension requested successfully. Pending manager approval.", result);
    }

    @RequestMapping(
            value = {"/deadlines/task/{taskId}/approve", "/tasks/{taskId}/deadline/extensions/approve"},
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResponseEntity<ApiResponse<Map<String, Object>>> approveExtension(
            @PathVariable String taskId,
            HttpServletRequest request
    ) {
        return ResponseFactory.ok(
                "Deadline extension approved successfully.",
                deadlineService.approveExtension(taskId, getCurrentUserId(request))
        );
    }

    @RequestMapping(
            value = {"/deadlines/task/{taskId}/reject", "/tasks/{taskId}/deadline/extensions/reject"},
            method = {RequestMethod.PUT, RequestMethod.POST}
    )
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectExtension(
            @PathVariable String taskId,
            @RequestBody(required = false) RejectExtensionRequest body,
            HttpServletRequest request
    ) {
        String reason = body == null
                ? ""
                : body.rejectReason() != null ? body.rejectReason() : body.reason();

        return ResponseFactory.ok(
                "Deadline extension request rejected.",
                deadlineService.rejectExtension(taskId, getCurrentUserId(request), reason)
        );
    }

    public record DeadlineConfigRequest(
            @JsonProperty("start_date") Instant startDate,
            @JsonProperty("due_date") Instant dueDate,
            @JsonProperty("reminder_offset") Integer reminderOffset,
            @JsonProperty("extension_limit") Integer extensionLimit
    ) {}

    public record ExtensionRequest(
            @JsonProperty("new_due_date") Instant newDueDate,
            @JsonProperty("requested_due_date") Instant requestedDueDate,
            String reason
    ) {}

    public record RejectExtensionRequest(
            String reason,
            @JsonProperty("reject_reason") String rejectReason
    ) {}
}