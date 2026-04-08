package com.fluxboard.board.task.dto.request;

// XÓA cái import JsonProperty dư thừa đi
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TaskMoveRequest(
        @NotBlank(message = "New column ID must not be blank.")
        String newColumnId,

        @NotNull(message = "New order must not be null.")
        Integer newOrder,

        // 👉 THÊM DÒNG NÀY ĐỂ KÍCH HOẠT REAL-TIME
        @NotBlank(message = "Board ID must not be blank.")
        String boardId
) {
}
