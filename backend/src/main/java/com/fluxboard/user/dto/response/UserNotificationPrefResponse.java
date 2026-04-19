package com.fluxboard.user.dto.response;

public record UserNotificationPrefResponse(
    boolean emailNotificationsEnabled,
    boolean inAppNotificationsEnabled
) {}