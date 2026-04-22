package com.fluxboard.project.projectmember.dto.response;

import com.fluxboard.board.task.dto.response.TaskUserSummaryResponse;
import java.time.Instant;
import java.util.List;

public record ProjectMemberResponse(
        String id,
        String projectId,
        String userId,
        TaskUserSummaryResponse user,
        List<String> roleIds,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
