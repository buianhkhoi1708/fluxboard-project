package com.fluxboard.dashboard.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardMetrics(
            @RequestParam(value = "time_range", required = false) String timeRange,
            @RequestParam(value = "department_id", required = false) String departmentId,
            @RequestParam(value = "team_id", required = false) String teamId,
            @RequestAttribute(value = AuthRequestContext.AUTH_USER_ATTR, required = false) AuthenticatedUser currentUser) {
        if (currentUser == null) throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in to view the Dashboard.");
        Map<String, Object> data = dashboardService.getDashboardMetrics(timeRange, departmentId, teamId, currentUser);
        return ResponseFactory.ok("Dashboard data retrieved successfully.", data);
    }
}