package com.fluxboard.dashboard.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.dashboard.service.DashboardService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardMetrics() {
        
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        AuthenticatedUser currentUser = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);

        if (currentUser == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in to view the Dashboard.");
        }

        String roleName = String.valueOf(currentUser.roleId());
        String currentUserId = currentUser.userId(); 

        Map<String, Object> metrics = dashboardService.getDashboardMetrics(roleName, currentUserId);

        return ResponseFactory.ok("Dashboard data retrieved successfully.", metrics);
    }
}