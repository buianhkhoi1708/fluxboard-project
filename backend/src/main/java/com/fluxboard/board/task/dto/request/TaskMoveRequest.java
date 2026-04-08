package com.fluxboard.board.task.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TaskMoveRequest(
        @NotBlank(message = "New column ID must not be blank.")
        @JsonProperty("newColumnId")
        String newColumnId,

        @NotNull(message = "New order must not be null.")
        @JsonProperty("newOrder")
        Integer newOrder
) {
}