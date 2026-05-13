package com.fluxboard.project.projectmember.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record UpdateProjectMemberRequest(
        @JsonProperty("role_ids")
        List<String> roleIds,

        @JsonProperty("is_active")
        Boolean active
) {
}
