package com.fluxboard.notification.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fluxboard.notification.entity.NotificationEntity;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public record NotificationResponse(
        String id,

        @JsonProperty("recipient_id")
        String recipientId,

        @JsonProperty("sender_id")
        String senderId,

        String type,
        String title,
        String message,

        @JsonProperty("reference_id")
        String referenceId,

        @JsonProperty("reference_type")
        String referenceType,

        @JsonProperty("action_url")
        String actionUrl,

        Map<String, Object> metadata,

        @JsonProperty("is_read")
        boolean isRead,

        String status,

        @JsonProperty("send_at")
        Instant sendAt,

        @JsonProperty("created_at")
        Instant createdAt,

        @JsonProperty("updated_at")
        Instant updatedAt,

        Instant timestamp,

        @JsonProperty("dedupe_key")
        String dedupeKey
) {
    public static NotificationResponse fromEntity(NotificationEntity entity) {
        if (entity == null) return null;

        Map<String, Object> safeMetadata = entity.getMetadata() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(entity.getMetadata());

        if (entity.getDedupeKey() != null && !entity.getDedupeKey().isBlank()) {
            safeMetadata.put("dedupe_key", entity.getDedupeKey());
            safeMetadata.put("dedupeKey", entity.getDedupeKey());
        }

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
                entity.getCreatedAt(),
                entity.getDedupeKey()
        );
    }
}