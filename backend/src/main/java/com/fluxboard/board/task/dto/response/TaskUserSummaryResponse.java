package com.fluxboard.board.task.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TaskUserSummaryResponse(
        String id,

        @JsonProperty("full_name") // 🚀 Ép đúng tên này cho JSON
        String fullName,

        @JsonProperty("avatar_url") // 🚀 Ép đúng tên này cho JSON
        String avatarUrl
) {
}