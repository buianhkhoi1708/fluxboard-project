package com.fluxboard.activity.controller;

import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.annotation.RequirePermission;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getRecentActivities(
            @RequestParam String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        return ResponseFactory.ok(
                "Recent activities retrieved successfully.",
                activityService.getRecentActivities(projectId, pageable)
        );
    }
}
    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivities(
            @RequestParam(required = false) List<ActivitySource> sourceTypes,
            @RequestParam(required = false) List<ActivityAction> actions,
            @RequestParam(required = false) List<String> actorUserIds,
            @RequestParam(required = false) String sourceId,
            @RequestParam(required = false) String projectId,
            @RequestParam(required = false) String boardId,
            @RequestParam(required = false) String taskId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        ActivityFilterRequest filter = new ActivityFilterRequest(
                sourceTypes,
                actions,
                actorUserIds,
                sourceId,
                projectId,
                boardId,
                taskId,
                from,
                to);
        Page<ActivityResponse> page = activityService.getPage(filter, pageable);
        return ResponseFactory.paged("Activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/{activityId}")
    public ResponseEntity<ApiResponse<ActivityResponse>> getActivityById(@PathVariable String activityId) {
        return ResponseFactory.ok("Activity retrieved successfully.", activityService.getById(activityId));
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByTask(
            @PathVariable String taskId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ActivityResponse> page = activityService.getPageByTask(taskId, pageable);
        return ResponseFactory.paged("Task activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ActivityResponse> page = activityService.getPageByProject(projectId, pageable);
        return ResponseFactory.paged("Project activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/sources/{sourceType}/{sourceId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesBySource(
            @PathVariable ActivitySource sourceType,
            @PathVariable String sourceId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Page<ActivityResponse> page = activityService.getPageBySource(sourceType, sourceId, pageable);
        return ResponseFactory.paged("Source activities retrieved successfully.", page);
    }
}
