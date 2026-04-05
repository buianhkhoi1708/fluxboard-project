package com.fluxboard.board.column.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardColumnRequest(
        @NotBlank(message = "Board ID must not be blank.")
        String boardId,

        @NotBlank(message = "Column name must not be blank.")
        @Size(max = 100, message = "Column name must be at most 100 characters.")
        String name
) {
}
