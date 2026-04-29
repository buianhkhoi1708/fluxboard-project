package com.fluxboard.activity.dto.response;

public record ActivityActorResponse(
        String userId,
        String fullName,
        String avatarUrl
) {
}
