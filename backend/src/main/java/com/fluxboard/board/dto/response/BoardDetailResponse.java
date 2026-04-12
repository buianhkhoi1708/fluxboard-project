package com.fluxboard.board.dto.response;

import java.util.List;

public record BoardDetailResponse(
        String id,
        String projectId,  // 🚀 Phải nằm ở vị trí thứ 2
        String boardName,
        List<BoardColumnDetailResponse> columns
) {}
