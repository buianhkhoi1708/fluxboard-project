package com.fluxboard.rbac.interceptor;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.rbac.annotation.RequirePermission;
import com.fluxboard.rbac.service.PermissionEvaluatorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    private final PermissionEvaluatorService permissionEvaluatorService;

    public PermissionInterceptor(PermissionEvaluatorService permissionEvaluatorService) {
        this.permissionEvaluatorService = permissionEvaluatorService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RequirePermission requirePermission = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (requirePermission == null) {
            requirePermission = handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
        }
        if (requirePermission == null) {
            return true;
        }

        Object authUserObject = request.getAttribute(AuthRequestContext.AUTH_USER_ATTR);
        if (!(authUserObject instanceof AuthenticatedUser authUser)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Unauthorized.");
        }

        if (!StringUtils.hasText(authUser.roleId())) {
            throw new AppException(ErrorCode.FORBIDDEN, "Role is required to access this resource.");
        }

        boolean permitted = permissionEvaluatorService.hasPermission(authUser.roleId(), requirePermission.value());
        if (!permitted) {
            throw new AppException(ErrorCode.FORBIDDEN, "You do not have permission to access this resource.");
        }

        return true;
    }
}
