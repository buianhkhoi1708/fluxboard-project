package com.fluxboard.project.dto.response;

import java.time.Instant;

public record ProjectResponse(
                String id,
                // String code,
                String name,
                String ownerId,
                String departmentId,
                String defaultBoardId,
                String status,
                Instant createdAt,
                Instant updatedAt) {
}
