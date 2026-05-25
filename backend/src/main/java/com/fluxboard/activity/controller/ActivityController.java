package com.fluxboard.activity.controller;

import com.fluxboard.activity.dto.request.ActivityFilterRequest;
import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.enums.ActivityAction;
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
import java.util.stream.Collectors;

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
            // 🚀 BỌC THÉP: Nhận vào List<String> thay vì Enum để tự xử lý hoa/thường
            @RequestParam(name = "source_type", required = false) List<String> sourceTypesStr,
            @RequestParam(name = "action", required = false) List<String> actionsStr,
            @RequestParam(name = "actor_user_id", required = false) List<String> actorUserIds,
            @RequestParam(name = "source_id", required = false) String sourceId,
            @RequestParam(name = "project_id", required = false) String projectId,
            @RequestParam(name = "board_id", required = false) String boardId,
            @RequestParam(name = "task_id", required = false) String taskId,
            @RequestParam(name = "from", required = false) java.time.Instant from,
            @RequestParam(name = "to", required = false) java.time.Instant to,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        // 🚀 TỰ ĐỘNG CHUYỂN ĐỔI: Map từ String sang Enum in hoa (Chống lỗi 400 Bad Request)
        List<ActivitySource> sourceTypes = sourceTypesStr == null ? null : sourceTypesStr.stream()
                .map(s -> ActivitySource.valueOf(s.toUpperCase()))
                .collect(Collectors.toList());

        List<ActivityAction> actions = actionsStr == null ? null : actionsStr.stream()
                .map(a -> ActivityAction.valueOf(a.toUpperCase()))
                .collect(Collectors.toList());

        ActivityFilterRequest filter = new ActivityFilterRequest(
                sourceTypes, actions, actorUserIds, sourceId, projectId, boardId, taskId, from, to
        );
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
            // 🚀 BỌC THÉP TƯƠNG TỰ: Đổi thành String để bắt lỗi luôn cho PathVariable
            @PathVariable String sourceType,
            @PathVariable String sourceId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        // Tự động IN HOA
        ActivitySource parsedSourceType = ActivitySource.valueOf(sourceType.toUpperCase());
        Page<ActivityResponse> page = activityService.getPageBySource(parsedSourceType, sourceId, pageable);
        return ResponseFactory.paged("Source activities retrieved successfully.", page);
    }
}