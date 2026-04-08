package com.fluxboard.board.dto.response;

import java.util.List;

public record BoardColumnDetailResponse(
        String id,

        String listName,

        int order,

        List<BoardTaskDetailResponse> tasks
) {
}
