package com.fluxboard.notification.dto.response;

import com.fluxboard.notification.entity.NotificationEntity;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public record NotificationResponse(
        String id,
        String recipientId,
        String senderId,
        String type,
        String title,
        String message,
        String referenceId,
        String referenceType,
        String actionUrl,
        Map<String, Object> metadata,
        boolean isRead,
        String status,
        Instant sendAt,
        Instant createdAt,
        Instant updatedAt,
        Instant timestamp
) {
    public static NotificationResponse fromEntity(NotificationEntity entity) {
        if (entity == null) return null;

        Map<String, Object> safeMetadata = entity.getMetadata() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(entity.getMetadata());

        return new NotificationResponse(
                entity.getId(),
                entity.getRecipientId(),
                entity.getSenderId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getReferenceId(),
                entity.getReferenceType(),
                entity.getActionUrl(),
                safeMetadata,
                entity.isRead(),
                entity.getStatus() == null ? null : entity.getStatus().name(),
                entity.getSendAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getCreatedAt()
        );
    }
}