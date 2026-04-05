package com.fluxboard.board.task.dto.response;

public record TaskUserSummaryResponse(
        String id,
        String fullName,
        String avatarUrl
) {
}
