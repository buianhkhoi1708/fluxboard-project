package com.fluxboard.board.task.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TaskMoveRequest(
        @NotBlank(message = "New column ID is required")
        String newColumnId,
        
        @NotNull(message = "New order is required")
        Integer newOrder
) {}