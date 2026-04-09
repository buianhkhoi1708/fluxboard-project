package com.fluxboard.auth.controller;

import com.fluxboard.auth.dto.request.ForgotPasswordRequest;
import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.request.ResetPasswordRequest;
import com.fluxboard.auth.dto.response.LoginResponse;
import com.fluxboard.auth.service.AuthService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseFactory.ok("Login successful.", authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String clientIp = httpServletRequest.getRemoteAddr();
        String testLink = authService.processForgotPassword(request, clientIp);
        
        return ResponseFactory.ok("If the email exists, a password reset link has been sent.", testLink);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.processResetPassword(request);
        return ResponseFactory.ok("Password has been reset successfully.");
    }
}