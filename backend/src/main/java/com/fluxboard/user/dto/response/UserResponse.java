package com.fluxboard.user.dto.response;

import java.time.Instant;

public record UserResponse(
        String id,
        String email,
        String fullName,
        String avatarUrl,
        String roleId,
        String departmentId,
        String teamId,
        Instant createdAt,
        Instant updatedAt
) {
}
