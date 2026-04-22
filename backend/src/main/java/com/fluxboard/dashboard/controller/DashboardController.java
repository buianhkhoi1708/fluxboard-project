package com.fluxboard.dashboard.controller;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.dashboard.service.DashboardService;

import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.repository.RoleRepository;

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
    private final RoleRepository roleRepository; 

    public DashboardController(DashboardService dashboardService, RoleRepository roleRepository) {
        this.dashboardService = dashboardService;
        this.roleRepository = roleRepository;
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardMetrics() {
        
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        AuthenticatedUser currentUser = (AuthenticatedUser) request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);

        if (currentUser == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Security: Please log in to view the Dashboard.");
        }

        String currentUserId = currentUser.userId(); 
        
        String roleId = currentUser.roleId(); 

        RoleEntity role = roleRepository.findById(roleId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User permissions not found."));
        
        String roleName = role.getName().name();

        Map<String, Object> metrics = dashboardService.getDashboardMetrics(roleName, currentUserId);

        return ResponseFactory.ok("Dashboard data retrieved successfully.", metrics);
    }
}