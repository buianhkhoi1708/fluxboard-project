package com.fluxboard.auth.filter;

import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.auth.service.JwtTokenService;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;

@Component
@Order(2)
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenService jwtTokenService;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService, HandlerExceptionResolver handlerExceptionResolver) {
        this.jwtTokenService = jwtTokenService;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || CorsUtils.isPreFlightRequest(request)) return true;
        String path = request.getServletPath();
        return "/health-check".equals(path)
                || "/auth/login".equals(path)
                || "/auth/forgot-password".equals(path)
                || "/auth/verify-reset-token".equals(path)
                || "/auth/reset-password".equals(path)
                || "/error".equals(path)
                || path.startsWith("/api/v1/ws-fluxboard")
                || path.startsWith("/ws-fluxboard");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        try {
            String authorization = request.getHeader("Authorization");
            if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header.");
            }

            String token = authorization.substring(7).trim();
            if (!StringUtils.hasText(token)) throw new AppException(ErrorCode.UNAUTHORIZED, "Access token is required.");

            AuthenticatedUser user = jwtTokenService.parseAccessToken(token);
            request.setAttribute(AuthRequestContext.AUTH_USER_ATTR, user);
            request.setAttribute("userId", user.userId());
            request.setAttribute("roleId", user.roleId());
            request.setAttribute("authorities", user.authorities());

            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            handlerExceptionResolver.resolveException(request, response, null, ex);
        }
    }
}