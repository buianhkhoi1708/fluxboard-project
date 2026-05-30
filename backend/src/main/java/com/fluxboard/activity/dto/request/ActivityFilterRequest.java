package com.fluxboard.activity.dto.request;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;

import java.time.Instant;
import java.util.List;

public record ActivityFilterRequest(
        ActivityEntity.ActivityType activityType,
        List<ActivitySource> sourceTypes,
        List<ActivityAction> actions,
        List<String> actorUserIds,
        List<String> targetUserIds,
        String sourceId,
        String projectId,
        List<String> projectIds, // 🚀 BỔ SUNG: Danh sách ID dự án cho sảnh chung
        String boardId,
        String taskId,
        Instant from,
        Instant to
) {
    // 🛡️ Constructor phụ: Đảm bảo Controller và Service cũ gọi không bị lỗi đỏ
    public ActivityFilterRequest(
            ActivityEntity.ActivityType activityType,
            List<ActivitySource> sourceTypes,
            List<ActivityAction> actions,
            List<String> actorUserIds,
            List<String> targetUserIds,
            String sourceId,
            String projectId,
            String boardId,
            String taskId,
            Instant from,
            Instant to
    ) {
        this(activityType, sourceTypes, actions, actorUserIds, targetUserIds, sourceId, projectId, null, boardId, taskId, from, to);
    }
}