package com.fluxboard.board.column.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateBoardColumnRequest(
        @NotBlank(message = "Column name must not be blank.")
        @Size(max = 100, message = "Column name must be at most 100 characters.")
        String name,

        @Min(value = 1, message = "Order must be at least 1.")
        Integer order
) {
}
