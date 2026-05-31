package com.fluxboard.board.task.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskCommentRequest(
        @JsonProperty("content")
        @JsonAlias({"message", "comment"})
        @NotBlank(message = "Comment content must not be blank.")
        @Size(max = 2000, message = "Comment content must be at most 2000 characters.")
        String content
) {
}