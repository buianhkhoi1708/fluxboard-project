package com.fluxboard.activity.controller;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.annotation.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class ActivityController {
    private final ActivityService activityService;

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getRecentActivities(
            @RequestParam String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        return ResponseFactory.ok("Recent activities retrieved successfully.", activityService.getRecentActivities(projectId, pageable, currentUser));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivities(
            @RequestParam(name = "tab", required = false) String tab,
            @RequestParam(name = "activity_type", required = false) String activityType,
            @RequestParam(name = "source_type", required = false) List<String> sourceTypesStr,
            @RequestParam(name = "action", required = false) List<String> actionsStr,
            @RequestParam(name = "actor_user_id", required = false) List<String> actorUserIds,
            @RequestParam(name = "target_user_id", required = false) List<String> targetUserIds,
            @RequestParam(name = "source_id", required = false) String sourceId,
            @RequestParam(name = "project_id", required = false) String projectId,
            @RequestParam(name = "board_id", required = false) String boardId,
            @RequestParam(name = "task_id", required = false) String taskId,
            @RequestParam(name = "from", required = false) Instant from,
            @RequestParam(name = "to", required = false) Instant to,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        ActivityEntity.ActivityType parsedType = parseActivityType(activityType != null ? activityType : tab);
        List<ActivitySource> sourceTypes = sourceTypesStr == null ? null : sourceTypesStr.stream().map(this::parseSource).toList();
        List<ActivityAction> actions = actionsStr == null ? null : actionsStr.stream().map(this::parseAction).toList();

        ActivityFilterRequest filter = new ActivityFilterRequest(parsedType, sourceTypes, actions, actorUserIds, targetUserIds, sourceId, projectId, boardId, taskId, from, to);
        Page<ActivityResponse> page = activityService.getPage(filter, pageable, currentUser);
        return ResponseFactory.paged("Activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/tabs/{tab}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByTab(
            @PathVariable String tab,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        ActivityFilterRequest filter = new ActivityFilterRequest(parseActivityType(tab), null, null, null, null, null, null, null, null, null, null);
        return ResponseFactory.paged("Activities retrieved successfully.", activityService.getPage(filter, pageable, currentUser));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/{activityId}")
    public ResponseEntity<ApiResponse<ActivityResponse>> getActivityById(
            @PathVariable String activityId,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        return ResponseFactory.ok("Activity retrieved successfully.", activityService.getById(activityId, currentUser));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByTask(
            @PathVariable String taskId,
            @RequestParam(name = "project_id", required = false) String projectId, 
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        return ResponseFactory.paged("Task activities retrieved successfully.", activityService.getPageByTask(taskId, projectId, pageable, currentUser));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        return ResponseFactory.paged("Project activities retrieved successfully.", activityService.getPageByProject(projectId, pageable, currentUser));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/sources/{sourceType}/{sourceId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesBySource(
            @PathVariable String sourceType,
            @PathVariable String sourceId,
            @RequestParam(name = "project_id", required = false) String projectId, 
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser currentUser) {
        return ResponseFactory.paged("Source activities retrieved successfully.", activityService.getPageBySource(parseSource(sourceType), sourceId, projectId, pageable, currentUser));
    }

    private ActivityEntity.ActivityType parseActivityType(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim().toUpperCase().replace("-", "_");
        if ("ACTIVITY".equals(normalized) || "ACTIVITY_LOGS".equals(normalized)) normalized = "ACTIVITY_LOG";
        if ("ACCOUNT".equals(normalized) || "ACCOUNTS".equals(normalized)) normalized = "ACCOUNT_MANAGEMENT";
        if ("SECURITY".equals(normalized) || "SECURITY_LOG".equals(normalized)) normalized = "SECURITY_AUDIT";
        try {
            return ActivityEntity.ActivityType.valueOf(normalized);
        } catch (Exception e) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid activity tab: " + value);
        }
    }

    private ActivitySource parseSource(String value) {
        try {
            return ActivitySource.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid activity source: " + value);
        }
    }

    private ActivityAction parseAction(String value) {
        try {
            return ActivityAction.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Invalid activity action: " + value);
        }
    }
}