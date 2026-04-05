package com.fluxboard.project.dto.response;

import java.time.Instant;

public record ProjectResponse(
        String id,
        String name,
        String ownerId,
        String departmentId,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
