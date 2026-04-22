package com.fluxboard.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPrefRequest(
        @NotNull(message = "The emailNotificationsEnabled configuration cannot be left blank.")
        Boolean emailNotificationsEnabled,

        @NotNull(message = "The inAppNotificationsEnabled configuration cannot be left blank.")
        Boolean inAppNotificationsEnabled
) {
}