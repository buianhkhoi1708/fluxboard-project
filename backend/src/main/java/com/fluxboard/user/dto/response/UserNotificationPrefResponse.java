package com.fluxboard.user.dto.response;

public record UserNotificationPrefResponse(
    boolean emailNotificationsEnabled,
    boolean inAppNotificationsEnabled,
    // Thêm các TH sự kiện nhận
    boolean notifyOnTaskAssign,
    boolean notifyOnDueDate,
    boolean notifyOnCommentMention
) {}