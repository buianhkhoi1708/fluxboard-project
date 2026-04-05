package com.fluxboard.board.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record BoardDetailResponse(
        @JsonProperty("id")
        String id,

        @JsonProperty("board_name")
        String boardName,

        @JsonProperty("columns")
        List<BoardColumnDetailResponse> columns
) {
}
