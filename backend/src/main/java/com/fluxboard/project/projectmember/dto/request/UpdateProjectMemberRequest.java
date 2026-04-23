package com.fluxboard.project.projectmember.dto.request;

import java.util.List;

public record UpdateProjectMemberRequest(
        List<String> roleIds,
        Boolean active
) {
}
