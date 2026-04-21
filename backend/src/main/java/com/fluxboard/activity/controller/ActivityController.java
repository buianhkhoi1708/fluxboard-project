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