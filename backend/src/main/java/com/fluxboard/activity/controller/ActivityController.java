package com.fluxboard.activity.controller;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.rbac.annotation.RequirePermission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getRecentActivities(
            @RequestParam String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        return ResponseFactory.ok(
                "Recent activities retrieved successfully.",
                activityService.getRecentActivities(projectId, pageable)
        );
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivities(
            @ModelAttribute ActivityFilterRequest filter,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
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
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<ActivityResponse> page = activityService.getPageByTask(taskId, pageable);
        return ResponseFactory.paged("Task activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/projects/{projectId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesByProject(
            @PathVariable String projectId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<ActivityResponse> page = activityService.getPageByProject(projectId, pageable);
        return ResponseFactory.paged("Project activities retrieved successfully.", page);
    }

    @RequirePermission("ACTIVITY_VIEW")
    @GetMapping("/sources/{sourceType}/{sourceId}")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getActivitiesBySource(
            @PathVariable ActivitySource sourceType,
            @PathVariable String sourceId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<ActivityResponse> page = activityService.getPageBySource(sourceType, sourceId, pageable);
        return ResponseFactory.paged("Source activities retrieved successfully.", page);
    }
}