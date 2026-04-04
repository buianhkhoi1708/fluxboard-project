package com.fluxboard.board.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardRequest(
        @NotBlank(message = "Project ID must not be blank.")
        String projectId,

        @NotBlank(message = "Board name must not be blank.")
        @Size(max = 150, message = "Board name must be at most 150 characters.")
        String name,

        @NotBlank(message = "Board type must not be blank.")
        @Size(max = 50, message = "Board type must be at most 50 characters.")
        String type,

        Boolean isDefault
) {
}
