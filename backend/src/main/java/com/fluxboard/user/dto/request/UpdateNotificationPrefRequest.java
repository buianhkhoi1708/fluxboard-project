package com.fluxboard.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateNotificationPrefRequest(
        @NotNull(message = "The emailNotificationsEnabled configuration cannot be left blank.")
        Boolean emailNotificationsEnabled,

        @NotNull(message = "The inAppNotificationsEnabled configuration cannot be left blank.")
        Boolean inAppNotificationsEnabled,

        // Thêm các TH sự kiện nhận
        @NotNull(message = "The notifyOnTaskAssign configuration cannot be left blank.")
        Boolean notifyOnTaskAssign,

        @NotNull(message = "The notifyOnDueDate configuration cannot be left blank.")
        Boolean notifyOnDueDate,

        @NotNull(message = "The notifyOnCommentMention configuration cannot be left blank.")
        Boolean notifyOnCommentMention
) {
}