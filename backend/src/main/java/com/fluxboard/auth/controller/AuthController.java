package com.fluxboard.auth.controller;

import com.fluxboard.auth.dto.request.ChangePasswordRequest;
import com.fluxboard.auth.dto.request.ForgotPasswordRequest;
import com.fluxboard.auth.dto.request.LoginRequest;
import com.fluxboard.auth.dto.request.RefreshTokenRequest;
import com.fluxboard.auth.dto.request.ResetPasswordRequest;
import com.fluxboard.auth.dto.response.LoginResponse;
import com.fluxboard.auth.model.AuthRequestContext;
import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.auth.service.AuthService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestAttribute;
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

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseFactory.ok("Token refreshed successfully.", authService.refreshToken(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseFactory.ok("If the email exists, a password reset link has been sent.", null);
    }

    @GetMapping("/verify-reset-token")
    public ResponseEntity<ApiResponse<Void>> verifyResetToken(@RequestParam String token) {
        return ResponseFactory.ok("Proceed to reset password."); 
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseFactory.ok("Password has been reset successfully.");
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @RequestAttribute(AuthRequestContext.AUTH_USER_ATTR) AuthenticatedUser authUser
    ) {
        authService.changePassword(authUser.userId(), request);
        return ResponseFactory.ok("Password changed successfully.");
    }
}