package com.fluxboard.notification.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.repository.NotificationRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationRepository notificationRepository;
    private final NotificationDispatcher notificationDispatcher;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            @RequestAttribute("userId") String userId,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);

        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<NotificationEntity> notificationPage = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(userId, false, pageable)
                : notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);

        return ResponseFactory.paged(
                "Fetch notifications successfully",
                notificationPage.map(NotificationResponse::fromEntity)
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@RequestAttribute("userId") String userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        return ResponseFactory.success("Fetch unread count successfully", count);
    }

    @GetMapping("/long-polling")
    public DeferredResult<ResponseEntity<ApiResponse<List<NotificationResponse>>>> longPollingNotifications(
            @RequestAttribute("userId") String userId
    ) {
        DeferredResult<ResponseEntity<ApiResponse<List<NotificationResponse>>>> result =
                new DeferredResult<>(35_000L);

        CompletableFuture<List<NotificationEntity>> future =
                notificationDispatcher.waitForRealtimeNotifications(userId, 30_000L);

        future.whenComplete((notifications, error) -> {
            if (result.isSetOrExpired()) return;

            if (error != null) {
                result.setResult(ResponseFactory.success("Polling cycle completed", List.of()));
                return;
            }

            List<NotificationResponse> payload = notifications == null
                    ? List.of()
                    : notifications.stream()
                    .map(NotificationResponse::fromEntity)
                    .toList();

            result.setResult(
                    ResponseFactory.success(
                            payload.isEmpty()
                                    ? "Polling cycle completed"
                                    : "New notifications retrieved successfully",
                            payload
                    )
            );
        });

        result.onTimeout(() -> {
            if (!future.isDone()) future.complete(List.of());
        });

        result.onError(error -> {
            if (!future.isDone()) future.complete(List.of());
        });

        return result;
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markAsRead(
            @RequestAttribute("userId") String userId,
            @PathVariable String id
    ) {
        NotificationEntity notification = notificationRepository.findByIdAndRecipientId(id, userId)
                .orElse(null);

        if (notification == null) {
            return ResponseFactory.success("Notification not found or already unavailable", null);
        }

        notification.setRead(true);
        NotificationEntity saved = notificationRepository.save(notification);

        return ResponseFactory.success(
                "Notification marked as read successfully",
                NotificationResponse.fromEntity(saved)
        );
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@RequestAttribute("userId") String userId) {
        List<NotificationEntity> unreadNotifications =
                notificationRepository.findByRecipientIdAndIsReadFalse(userId);

        for (NotificationEntity notification : unreadNotifications) {
            notification.setRead(true);
        }

        notificationRepository.saveAll(unreadNotifications);
        return ResponseFactory.success("All notifications marked as read successfully");
    }

    public static class NotificationResponse {
        private String id;
        private String recipientId;
        private String senderId;
        private String title;
        private String message;
        private String type;
        private String referenceId;
        private String referenceType;
        private String actionUrl;
        private Map<String, Object> metadata;
        private Instant timestamp;
        private Instant createdAt;
        private Instant updatedAt;
        private Instant sendAt;
        private String status;
        private boolean isRead;

        public static NotificationResponse fromEntity(NotificationEntity entity) {
            if (entity == null) return null;

            NotificationResponse response = new NotificationResponse();
            response.id = entity.getId();
            response.recipientId = entity.getRecipientId();
            response.senderId = entity.getSenderId();
            response.title = entity.getTitle();
            response.message = entity.getMessage();
            response.type = entity.getType();
            response.referenceId = entity.getReferenceId();
            response.referenceType = entity.getReferenceType();
            response.actionUrl = entity.getActionUrl();
            response.metadata = entity.getMetadata() == null
                    ? new LinkedHashMap<>()
                    : new LinkedHashMap<>(entity.getMetadata());
            response.timestamp = entity.getCreatedAt();
            response.createdAt = entity.getCreatedAt();
            response.updatedAt = entity.getUpdatedAt();
            response.sendAt = entity.getSendAt();
            response.status = entity.getStatus() == null ? null : entity.getStatus().name();
            response.isRead = entity.isRead();
            return response;
        }

        public String getId() {
            return id;
        }

        public String getRecipientId() {
            return recipientId;
        }

        public String getSenderId() {
            return senderId;
        }

        public String getTitle() {
            return title;
        }

        public String getMessage() {
            return message;
        }

        public String getType() {
            return type;
        }

        public String getReferenceId() {
            return referenceId;
        }

        public String getReferenceType() {
            return referenceType;
        }

        public String getActionUrl() {
            return actionUrl;
        }

        public Map<String, Object> getMetadata() {
            return metadata;
        }

        public Instant getTimestamp() {
            return timestamp;
        }

        public Instant getCreatedAt() {
            return createdAt;
        }

        public Instant getUpdatedAt() {
            return updatedAt;
        }

        public Instant getSendAt() {
            return sendAt;
        }

        public String getStatus() {
            return status;
        }

        public boolean isRead() {
            return isRead;
        }
    }
}