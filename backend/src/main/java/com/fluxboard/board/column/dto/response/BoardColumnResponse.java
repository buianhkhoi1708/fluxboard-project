package com.fluxboard.board.column.dto.response;

import java.time.Instant;

public record BoardColumnResponse(
        String id,
        String boardId,
        String name,
        int position,
        boolean isDoneColumn,
        Instant createdAt,
        Instant updatedAt
) {
}
