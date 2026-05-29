package com.fluxboard.auth.dto.response;

import java.time.Instant;

public record LoginResponse(
        String accessToken,
        String tokenType,
        Instant expiresAt,
        String refreshToken,
        String userId,
        String email,
        String fullName,
        String roleId,
        String roleName
) {
    public LoginResponse(String accessToken, String tokenType, Instant expiresAt, String refreshToken,
                         String userId, String email, String fullName, String roleId) {
        this(accessToken, tokenType, expiresAt, refreshToken, userId, email, fullName, roleId, null);
    }
}