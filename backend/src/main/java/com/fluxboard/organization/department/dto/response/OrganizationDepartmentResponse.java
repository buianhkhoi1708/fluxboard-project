package com.fluxboard.organization.department.dto.response;

import java.time.Instant;

public record OrganizationDepartmentResponse(
        String id,
        String name,
        String code,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}
