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
import java.io.IOException;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

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
        if (CorsUtils.isPreFlightRequest(request)) {
            return true;
        }

        String servletPath = request.getServletPath();
        return "/health-check".equals(servletPath)
                || "/auth/login".equals(servletPath)
                || "/auth/forgot-password".equals(servletPath)
                || "/auth/reset-password".equals(servletPath)
                || "/error".equals(servletPath)
                || servletPath.startsWith("/api/v1/ws-fluxboard")
                || servletPath.startsWith("/ws-fluxboard");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String authorization = request.getHeader("Authorization");
            if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header.");
            }

            String token = authorization.substring(7).trim();
            if (!StringUtils.hasText(token)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Access token is required.");
            }

            AuthenticatedUser authenticatedUser = jwtTokenService.parseAccessToken(token);
            request.setAttribute(AuthRequestContext.AUTH_USER_ATTR, authenticatedUser);
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            handlerExceptionResolver.resolveException(request, response, null, ex);
        }
    }
}