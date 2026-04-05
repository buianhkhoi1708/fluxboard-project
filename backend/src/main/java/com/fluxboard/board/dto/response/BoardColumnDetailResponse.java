package com.fluxboard.board.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record BoardColumnDetailResponse(
        @JsonProperty("id")
        String id,

        @JsonProperty("list_name")
        String listName,

        @JsonProperty("order")
        int order,

        @JsonProperty("tasks")
        List<BoardTaskDetailResponse> tasks
) {
}
