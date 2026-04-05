package com.fluxboard.project.dto.response;

import com.fluxboard.board.dto.response.BoardResponse;
import com.fluxboard.board.column.dto.response.BoardColumnResponse;
import java.util.List;

public record ProjectBoardOverviewResponse(
        BoardResponse board,
        List<BoardColumnResponse> columns
) {
}
