package com.fluxboard.notification.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.notification.dto.response.NotificationResponse;
import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.repository.NotificationRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

import java.util.ArrayList;
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

        List<NotificationEntity> source = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(userId, false)
                : notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);

        List<NotificationEntity> distinct = distinctNotifications(source);
        List<NotificationResponse> responses = slice(distinct, safePage, safeSize)
                .stream()
                .map(NotificationResponse::fromEntity)
                .toList();

        return ResponseFactory.paged(
                "Fetch notifications successfully",
                new PageImpl<>(responses, pageable, distinct.size())
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@RequestAttribute("userId") String userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository.findByRecipientIdAndIsReadFalse(userId);
        long count = distinctNotifications(unreadNotifications).size();
        return ResponseFactory.success("Fetch unread count successfully", count);
    }

    @GetMapping("/long-polling")
    public DeferredResult<ResponseEntity<ApiResponse<List<NotificationResponse>>>> longPollingNotifications(
            @RequestAttribute("userId") String userId
    ) {
        DeferredResult<ResponseEntity<ApiResponse<List<NotificationResponse>>>> result = new DeferredResult<>(35_000L);
        CompletableFuture<List<NotificationEntity>> future = notificationDispatcher.waitForRealtimeNotifications(userId, 30_000L);

        future.whenComplete((notifications, error) -> {
            if (result.isSetOrExpired()) return;

            if (error != null) {
                result.setResult(ResponseFactory.success("Polling cycle completed", List.of()));
                return;
            }

            List<NotificationResponse> payload = notifications == null
                    ? List.of()
                    : distinctNotifications(notifications).stream().map(NotificationResponse::fromEntity).toList();

            result.setResult(ResponseFactory.success(
                    payload.isEmpty() ? "Polling cycle completed" : "New notifications retrieved successfully",
                    payload
            ));
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
        NotificationEntity notification = notificationRepository.findByIdAndRecipientId(id, userId).orElse(null);

        if (notification == null) {
            return ResponseFactory.success("Notification not found or already unavailable", null);
        }

        String key = semanticKey(notification);
        List<NotificationEntity> sameNotifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(item -> semanticKey(item).equals(key))
                .toList();

        if (sameNotifications.isEmpty()) {
            notification.setRead(true);
            NotificationEntity saved = notificationRepository.save(notification);
            return ResponseFactory.success("Notification marked as read successfully", NotificationResponse.fromEntity(saved));
        }

        for (NotificationEntity item : sameNotifications) item.setRead(true);
        notificationRepository.saveAll(sameNotifications);

        NotificationEntity savedTarget = sameNotifications.stream()
                .filter(item -> id.equals(item.getId()))
                .findFirst()
                .orElse(sameNotifications.get(0));

        return ResponseFactory.success("Notification marked as read successfully", NotificationResponse.fromEntity(savedTarget));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@RequestAttribute("userId") String userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository.findByRecipientIdAndIsReadFalse(userId);
        for (NotificationEntity notification : unreadNotifications) notification.setRead(true);
        notificationRepository.saveAll(unreadNotifications);
        return ResponseFactory.success("All notifications marked as read successfully");
    }

    private List<NotificationEntity> distinctNotifications(List<NotificationEntity> source) {
        Map<String, NotificationEntity> result = new LinkedHashMap<>();

        for (NotificationEntity notification : source == null ? List.<NotificationEntity>of() : source) {
            String key = semanticKey(notification);
            NotificationEntity existing = result.get(key);

            if (existing == null) {
                result.put(key, notification);
                continue;
            }

            if (existing.isRead() && !notification.isRead()) {
                notification.setRead(true);
                result.put(key, notification);
            }
        }

        return new ArrayList<>(result.values());
    }

    private List<NotificationEntity> slice(List<NotificationEntity> source, int page, int size) {
        if (source == null || source.isEmpty()) return List.of();

        int from = Math.min(page * size, source.size());
        int to = Math.min(from + size, source.size());

        if (from >= to) return List.of();
        return source.subList(from, to);
    }

    private String semanticKey(NotificationEntity notification) {
        if (notification == null) return "NULL";

        if (notification.getDedupeKey() != null && !notification.getDedupeKey().isBlank()) {
            return notification.getDedupeKey();
        }

        Map<String, Object> metadata = notification.getMetadata();
        String type = safe(notification.getType());
        String referenceId = safe(notification.getReferenceId());
        String taskId = first(metadata, "task_id", "taskId", "task");
        String requesterId = first(metadata, "requester_id", "requesterId");
        String dueDate = first(
                metadata,
                "requested_due_date",
                "requestedDueDate",
                "approved_due_date",
                "approvedDueDate",
                "current_due_date",
                "currentDueDate",
                "due_date",
                "dueDate"
        );

        if (type.startsWith("EXTENSION_") || type.contains("DEADLINE") || type.contains("OVERDUE")) {
            return String.join("|",
                    safe(notification.getRecipientId()),
                    type,
                    firstNonBlank(referenceId, taskId),
                    requesterId,
                    safe(notification.getSenderId()),
                    dueDate
            );
        }

        return String.join("|",
                safe(notification.getRecipientId()),
                type,
                firstNonBlank(referenceId, taskId),
                safe(notification.getId())
        );
    }

    private String first(Map<String, Object> metadata, String... keys) {
        if (metadata == null) return "";

        for (String key : keys) {
            Object value = metadata.get(key);
            if (value != null && !String.valueOf(value).isBlank()) return String.valueOf(value);
        }

        return "";
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) return value;
        }

        return "";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}