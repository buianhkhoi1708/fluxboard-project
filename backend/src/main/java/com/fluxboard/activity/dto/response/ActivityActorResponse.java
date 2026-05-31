package com.fluxboard.activity.dto.response;

public record ActivityActorResponse(
        String userId,
        String fullName,
        String email,
        String avatarUrl,
        String roleId,
        String roleName,
        String status
) {}