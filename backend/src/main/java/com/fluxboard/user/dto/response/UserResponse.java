package com.fluxboard.user.dto.response;

import java.time.Instant;

public record UserResponse(
        String id,
        String email,
        String fullName,
        String avatarUrl,
        String roleId,
        String roleName,
        String teamId,
        String departmentId,
        String status,
        boolean online,
        Instant lastSeenAt,
        Instant createdAt,
        Instant updatedAt
) {
    public UserResponse(String id, String email, String fullName, String avatarUrl, String roleId, String teamId, Instant createdAt, Instant updatedAt) {
        this(id, email, fullName, avatarUrl, roleId, null, teamId, null, null, false, null, createdAt, updatedAt);
    }
}