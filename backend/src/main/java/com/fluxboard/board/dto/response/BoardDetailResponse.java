package com.fluxboard.board.dto.response;

import java.util.List;

public record BoardDetailResponse(
        String id,

        String boardName,

        List<BoardColumnDetailResponse> columns
) {
}
