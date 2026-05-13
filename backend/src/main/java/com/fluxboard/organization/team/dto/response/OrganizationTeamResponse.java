package com.fluxboard.organization.team.dto.response;

import java.time.Instant;

public record OrganizationTeamResponse(
        String id,
        String name,
        String code,
        String departmentId,
        String description,
        String leadId,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
