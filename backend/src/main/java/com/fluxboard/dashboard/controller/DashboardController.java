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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Object>> getDashboardMetrics(
            @RequestParam(value = "time_range", required = false) String timeRange,
            @RequestParam(value = "department_id", required = false) String departmentId,
            @RequestParam(value = "team_id", required = false) String teamId) {
        
        // Tự động trích xuất thông tin người dùng từ Context (được JWT Filter thiết lập)[cite: 5]
        AuthenticatedUser currentUser = (AuthenticatedUser) RequestContextHolder
                .currentRequestAttributes()
                .getAttribute(AuthRequestContext.AUTH_USER_ATTR, RequestAttributes.SCOPE_REQUEST);

        if (currentUser == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in to view the Dashboard.");
        }

        // Truyền các Query Parameters lọc dữ liệu xuống Service[cite: 5]
        Object metricsData = dashboardService.getDashboardMetrics(timeRange, departmentId, teamId, currentUser);
        
        return ResponseFactory.ok("Dashboard data retrieved successfully.", metricsData);
    }
}