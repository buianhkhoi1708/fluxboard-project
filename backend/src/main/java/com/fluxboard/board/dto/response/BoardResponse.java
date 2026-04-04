package com.fluxboard.board.dto.response;

import java.time.Instant;

public record BoardResponse(
        String id,
        String projectId,
        String name,
        String type,
        boolean isDefault,
        Instant createdAt,
        Instant updatedAt
) {
}
