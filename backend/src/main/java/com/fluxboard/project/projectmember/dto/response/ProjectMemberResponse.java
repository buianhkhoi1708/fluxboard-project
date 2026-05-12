package com.fluxboard.project.projectmember.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

public record ProjectMemberResponse(
        @JsonProperty("member_record_id")
        String id,

        @JsonProperty("user_id")
        String userId,

        @JsonProperty("full_name")
        String fullName,

        @JsonProperty("email")
        String email,

        @JsonProperty("avatar_url")
        String avatarUrl,

        @JsonProperty("is_active")
        boolean active,

        @JsonProperty("role_ids")
        List<String> roleIds,

        @JsonProperty("joined_at")
        Instant joinedAt
) {
}
