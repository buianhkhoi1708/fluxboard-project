package com.fluxboard.project.dto.response;

import java.util.List;

public record ProjectOverviewResponse(
        ProjectResponse project,
        List<ProjectBoardOverviewResponse> boards
) {
}
