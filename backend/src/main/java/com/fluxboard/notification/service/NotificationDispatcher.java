package com.fluxboard.notification.service;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.email.service.EmailService;
import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.entity.NotificationEntity.NotificationStatus;
import com.fluxboard.notification.repository.NotificationRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.user.service.UserNotificationPrefService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ScheduledFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDispatcher {
    private static final long TASK_UPDATE_MOVE_DEBOUNCE_MS = 60_000L;

    private static final Set<String> IMMEDIATE_EMAIL_TYPES = Set.of(
            "EXTENSION_REQUEST",
            "EXTENSION_SUBMITTED",
            "EXTENSION_APPROVED",
            "EXTENSION_APPROVED_BY_YOU",
            "EXTENSION_REJECTED",
            "EXTENSION_REJECTED_BY_YOU",
            "TASK_COMPLETED",
            "TASK_COMPLETED_BY_YOU"
    );

    private static final Set<String> DEADLINE_REMINDER_TYPES = Set.of(
            "TASK_OVERDUE",
            "TASK_DEADLINE_REMINDER",
            "DEADLINE_REMINDER",
            "DEADLINE_APPROACHING"
    );

    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserNotificationPrefService prefService;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationDebounceService debounceService;
    private final TaskScheduler taskScheduler;

    private final Map<String, ScheduledFuture<?>> pendingDeadlineUpdateEmails = new ConcurrentHashMap<>();
    private final Map<String, CopyOnWriteArrayList<CompletableFuture<List<NotificationEntity>>>> realtimeWaiters =
            new ConcurrentHashMap<>();

    private record DispatchOutcome(NotificationEntity notification, boolean created) {
    }

    public CompletableFuture<List<NotificationEntity>> waitForRealtimeNotifications(String userId, long timeoutMs) {
        CompletableFuture<List<NotificationEntity>> future = new CompletableFuture<>();

        if (userId == null || userId.isBlank()) {
            future.complete(List.of());
            return future;
        }

        realtimeWaiters.computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>()).add(future);

        taskScheduler.schedule(() -> {
            if (!future.isDone()) future.complete(List.of());
        }, Instant.now().plusMillis(timeoutMs));

        future.whenComplete((result, error) -> {
            CopyOnWriteArrayList<CompletableFuture<List<NotificationEntity>>> waiters = realtimeWaiters.get(userId);
            if (waiters != null) {
                waiters.remove(future);
                if (waiters.isEmpty()) realtimeWaiters.remove(userId);
            }
        });

        return future;
    }

    public void dispatchTaskCreated(String taskId, String actorId) {
        TaskEntity task = getTask(taskId);
        if (task == null) return;

        debounceService.markTaskRecentlyCreated(taskId);

        String actionUrl = getTaskActionUrl(task);
        Map<String, Object> metadata = buildTaskMetadata(task);

        for (String recipientId : resolveTaskAssignees(task)) {
            dispatch(recipientId, actorId, "Được giao công việc mới",
                    "Bạn vừa được phân công vào công việc: " + safeTaskTitle(task),
                    null, "TASK_CREATE", task.getId(), "TASK", actionUrl, metadata, true);
        }

        if (actorId != null && !actorId.isBlank()) {
            dispatch(actorId, actorId, "Bạn đã tạo công việc",
                    "Bạn đã tạo công việc: " + safeTaskTitle(task),
                    null, "TASK_CREATE_BY_YOU", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void dispatchTaskUpdated(String taskId, String actorId) {
        if (debounceService.isTaskRecentlyCreated(taskId) || debounceService.isTaskRecentlyCompleted(taskId)) return;

        debounceService.debounce("TASK_UPDATE_" + taskId, () -> {
            TaskEntity task = getTask(taskId);
            if (task == null) return;

            String actionUrl = getTaskActionUrl(task);
            Map<String, Object> metadata = buildTaskMetadata(task);

            for (String recipientId : resolveTaskAssignees(task)) {
                dispatch(recipientId, actorId, "Công việc đã được cập nhật",
                        "Công việc \"" + safeTaskTitle(task) + "\" vừa được cập nhật.",
                        null, "TASK_UPDATE", task.getId(), "TASK", actionUrl, metadata, true);
            }

            if (actorId != null && !actorId.isBlank()) {
                dispatch(actorId, actorId, "Bạn đã cập nhật công việc",
                        "Bạn đã cập nhật công việc: " + safeTaskTitle(task),
                        null, "TASK_UPDATE_BY_YOU", task.getId(), "TASK", actionUrl, metadata, true);
            }
        }, TASK_UPDATE_MOVE_DEBOUNCE_MS);
    }

    public void dispatchTaskMoved(String taskId, String actorId, String destinationColumnId, String destinationColumnName) {
        if (debounceService.isTaskRecentlyCreated(taskId) || debounceService.isTaskRecentlyCompleted(taskId)) return;

        debounceService.debounce("TASK_MOVE_" + taskId, () -> {
            TaskEntity task = getTask(taskId);
            if (task == null) return;

            String actionUrl = getTaskActionUrl(task);
            String stageName = destinationColumnName == null || destinationColumnName.isBlank()
                    ? "trạng thái mới"
                    : destinationColumnName;

            Map<String, Object> metadata = buildTaskMetadata(task);
            putIfPresent(metadata, "destination_column_id", destinationColumnId);
            putIfPresent(metadata, "destinationColumnId", destinationColumnId);
            putIfPresent(metadata, "destination_column_name", stageName);
            putIfPresent(metadata, "destinationColumnName", stageName);

            for (String recipientId : resolveTaskAssignees(task)) {
                dispatch(recipientId, actorId, "Công việc đã được di chuyển",
                        "Công việc \"" + safeTaskTitle(task) + "\" đã được chuyển sang " + stageName,
                        null, "TASK_MOVE", task.getId(), "TASK", actionUrl, metadata, true);
            }

            if (actorId != null && !actorId.isBlank()) {
                dispatch(actorId, actorId, "Bạn đã di chuyển công việc",
                        "Bạn đã chuyển công việc \"" + safeTaskTitle(task) + "\" sang " + stageName,
                        null, "TASK_MOVE_BY_YOU", task.getId(), "TASK", actionUrl, metadata, true);
            }
        }, TASK_UPDATE_MOVE_DEBOUNCE_MS);
    }

    public void dispatchTaskCompleted(String taskId, String actorId) {
        if (!debounceService.markTaskCompletedOnce(taskId)) return;

        TaskEntity task = getTask(taskId);
        if (task == null) return;

        String actionUrl = getTaskActionUrl(task);
        String actorName = resolveUserDisplayName(actorId, "Một thành viên");
        Instant completedAt = Instant.now();

        Map<String, Object> metadata = buildTaskMetadata(task);
        putIfPresent(metadata, "completed_by_id", actorId);
        putIfPresent(metadata, "completedById", actorId);
        metadata.put("completed_by_name", actorName);
        metadata.put("completedByName", actorName);
        metadata.put("completed_at", completedAt);
        metadata.put("completedAt", completedAt);

        for (String recipientId : resolveTaskParticipants(task, actorId)) {
            boolean isActor = idsEqual(recipientId, actorId);

            dispatch(recipientId, actorId,
                    isActor ? "Bạn đã hoàn thành công việc" : "Công việc đã hoàn thành",
                    isActor
                            ? "Bạn đã đánh dấu hoàn thành công việc: " + safeTaskTitle(task)
                            : actorName + " đã đánh dấu hoàn thành công việc: " + safeTaskTitle(task),
                    null,
                    isActor ? "TASK_COMPLETED_BY_YOU" : "TASK_COMPLETED",
                    task.getId(),
                    "TASK",
                    actionUrl,
                    metadata,
                    true);
        }
    }

    public void dispatchTaskMovedNotification(String recipientId, String taskId, String taskName, String boardId) {
        String actionUrl = buildActionUrl(boardId, taskId);

        Map<String, Object> metadata = new LinkedHashMap<>();
        putTaskNavigationMetadata(metadata, taskId, boardId, taskName);
        metadata.put("task_title", taskName);
        metadata.put("taskTitle", taskName);
        putIfPresent(metadata, "action_url", actionUrl);
        putIfPresent(metadata, "actionUrl", actionUrl);

        dispatch(recipientId, null, "Cập nhật công việc",
                "Công việc \"" + taskName + "\" đã được cập nhật vị trí hoặc trạng thái trên bảng.",
                null, "TASK_MOVE", taskId, "TASK", actionUrl, metadata, true);
    }

    public void notifyTaskAssigned(String userId, TaskEntity task) {
        if (userId == null || task == null) return;

        String actionUrl = getTaskActionUrl(task);
        Map<String, Object> metadata = buildTaskMetadata(task);

        dispatch(userId, readString(task, "getAuthorUserId", "getCreatedBy", "getCreatedById"),
                "Giao việc mới",
                "Bạn đã được gán vào công việc mới: \"" + safeTaskTitle(task) + "\".",
                null, "TASK_CREATE", task.getId(), "TASK", actionUrl, metadata, true);
    }

    public void notifyTaskDeadline(String taskId) {
        dispatchUpcomingAlert(taskId);
    }

    public void dispatchUpcomingAlert(String taskId) {
        TaskEntity task = getTask(taskId);
        if (task == null) return;

        String actionUrl = getTaskActionUrl(task);
        Map<String, Object> metadata = buildTaskMetadata(task);
        Instant dueDate = readInstant(task, "getDueDate", "getDueAt");

        metadata.put("due_date", dueDate);
        metadata.put("dueDate", dueDate);
        metadata.put("is_overdue", false);
        metadata.put("isOverdue", false);

        for (String userId : resolveTaskAssignees(task)) {
            dispatch(userId, null, "Công việc sắp đến hạn",
                    "Deadline của công việc \"" + safeTaskTitle(task) + "\" còn dưới 24 giờ.",
                    null, "TASK_DEADLINE_REMINDER", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void dispatchOverdueAlert(String taskId) {
        TaskEntity task = getTask(taskId);
        if (task == null) return;

        String actionUrl = getTaskActionUrl(task);
        Map<String, Object> metadata = buildTaskMetadata(task);
        Instant dueDate = readInstant(task, "getDueDate", "getDueAt");

        metadata.put("due_date", dueDate);
        metadata.put("dueDate", dueDate);
        metadata.put("is_overdue", true);
        metadata.put("isOverdue", true);

        for (String userId : resolveTaskAssignees(task)) {
            dispatch(userId, null, "Công việc đã quá hạn",
                    "Công việc \"" + safeTaskTitle(task) + "\" đã quá hạn.",
                    null, "TASK_OVERDUE", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void scheduleDeadlineUpdateNotification(String taskId) {
        ScheduledFuture<?> existingTimer = pendingDeadlineUpdateEmails.get(taskId);

        if (existingTimer != null && !existingTimer.isDone()) {
            existingTimer.cancel(false);
        }

        ScheduledFuture<?> newTimer = taskScheduler.schedule(() -> {
            pendingDeadlineUpdateEmails.remove(taskId);
            executeDeadlineUpdatedNotification(taskId);
        }, Instant.now().plusSeconds(600));

        pendingDeadlineUpdateEmails.put(taskId, newTimer);
    }

    private void executeDeadlineUpdatedNotification(String taskId) {
        TaskEntity task = getTask(taskId);
        if (task == null) return;

        String actionUrl = getTaskActionUrl(task);
        Map<String, Object> metadata = buildTaskMetadata(task);

        for (String userId : resolveTaskAssignees(task)) {
            dispatch(userId, null, "Deadline đã được cập nhật",
                    "Deadline của công việc \"" + safeTaskTitle(task) + "\" vừa được cập nhật.",
                    null, "DEADLINE_UPDATED", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void notifyExtensionRequested(
            String managerId,
            String requesterId,
            String requesterName,
            TaskEntity task,
            Instant currentDueDate,
            Instant requestedDueDate,
            String reason
    ) {
        if (managerId == null || managerId.isBlank() || task == null) return;

        String actionUrl = getTaskActionUrl(task);
        Instant requestedAt = Instant.now();
        Instant expiresAt = requestedAt.plus(3, ChronoUnit.DAYS);

        Map<String, Object> metadata = buildTaskMetadata(task);
        putIfPresent(metadata, "requester_id", requesterId);
        putIfPresent(metadata, "requesterId", requesterId);
        metadata.put("requester_name", requesterName == null ? "Nhân viên" : requesterName);
        metadata.put("requesterName", requesterName == null ? "Nhân viên" : requesterName);
        metadata.put("current_due_date", currentDueDate);
        metadata.put("currentDueDate", currentDueDate);
        metadata.put("requested_due_date", requestedDueDate);
        metadata.put("requestedDueDate", requestedDueDate);
        metadata.put("reason", reason == null ? "" : reason);
        metadata.put("extension_status", "PENDING");
        metadata.put("extensionStatus", "PENDING");
        metadata.put("extension_requested_at", requestedAt);
        metadata.put("extensionRequestedAt", requestedAt);
        metadata.put("expires_at", expiresAt);
        metadata.put("expiresAt", expiresAt);
        metadata.put("can_review", true);
        metadata.put("canReview", true);

        dispatch(managerId, requesterId, "Yêu cầu dời deadline",
                (requesterName == null ? "Nhân viên" : requesterName) + " xin dời deadline công việc: " + safeTaskTitle(task),
                null, "EXTENSION_REQUEST", task.getId(), "TASK", actionUrl, metadata, true);

        if (requesterId != null && !requesterId.isBlank()) {
            Map<String, Object> requesterMetadata = new LinkedHashMap<>(metadata);
            requesterMetadata.put("can_review", false);
            requesterMetadata.put("canReview", false);

            dispatch(requesterId, requesterId, "Đã gửi yêu cầu dời deadline",
                    "Bạn đã gửi yêu cầu dời deadline công việc: " + safeTaskTitle(task),
                    null, "EXTENSION_SUBMITTED", task.getId(), "TASK", actionUrl, requesterMetadata, true);
        }
    }

    public void notifyExtensionRequested(String managerId, String requesterName, String taskTitle, String requestedDueDate, String reason) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("task_title", taskTitle);
        metadata.put("taskTitle", taskTitle);
        metadata.put("requester_name", requesterName);
        metadata.put("requesterName", requesterName);
        metadata.put("requested_due_date", requestedDueDate);
        metadata.put("requestedDueDate", requestedDueDate);
        metadata.put("reason", reason == null ? "" : reason);
        metadata.put("extension_status", "PENDING");
        metadata.put("extensionStatus", "PENDING");
        metadata.put("can_review", true);
        metadata.put("canReview", true);

        dispatch(managerId, null, "Yêu cầu dời deadline",
                requesterName + " xin dời deadline công việc: " + taskTitle,
                null, "EXTENSION_REQUEST", null, "TASK", null, metadata, true);
    }

    public void notifyExtensionApproved(String userId, String managerId, TaskEntity task, Instant originalDueDate, Instant newDueDate, String reason) {
        if (userId == null || userId.isBlank() || task == null) return;

        String actionUrl = getTaskActionUrl(task);

        Map<String, Object> metadata = buildTaskMetadata(task);
        putIfPresent(metadata, "requester_id", userId);
        putIfPresent(metadata, "requesterId", userId);
        metadata.put("current_due_date", originalDueDate);
        metadata.put("currentDueDate", originalDueDate);
        metadata.put("approved_due_date", newDueDate);
        metadata.put("approvedDueDate", newDueDate);
        metadata.put("requested_due_date", newDueDate);
        metadata.put("requestedDueDate", newDueDate);
        metadata.put("reason", reason == null ? "" : reason);
        metadata.put("extension_status", "APPROVED");
        metadata.put("extensionStatus", "APPROVED");
        metadata.put("can_review", false);
        metadata.put("canReview", false);

        dispatch(userId, managerId, "Yêu cầu dời deadline đã được duyệt",
                "Yêu cầu dời deadline công việc \"" + safeTaskTitle(task) + "\" đã được chấp nhận.",
                null, "EXTENSION_APPROVED", task.getId(), "TASK", actionUrl, metadata, true);

        if (managerId != null && !managerId.isBlank()) {
            dispatch(managerId, managerId, "Bạn đã duyệt yêu cầu dời deadline",
                    "Bạn đã chấp nhận dời deadline công việc: " + safeTaskTitle(task),
                    null, "EXTENSION_APPROVED_BY_YOU", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void notifyExtensionApproved(String userId, String taskTitle, String newDueDate) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("task_title", taskTitle);
        metadata.put("taskTitle", taskTitle);
        metadata.put("approved_due_date", newDueDate);
        metadata.put("approvedDueDate", newDueDate);
        metadata.put("extension_status", "APPROVED");
        metadata.put("extensionStatus", "APPROVED");

        dispatch(userId, null, "Yêu cầu dời deadline đã được duyệt",
                "Yêu cầu dời deadline công việc \"" + taskTitle + "\" đã được phê duyệt đến ngày " + newDueDate,
                null, "EXTENSION_APPROVED", null, "TASK", null, metadata, true);
    }

    public void notifyExtensionRejected(
            String userId,
            String managerId,
            TaskEntity task,
            Instant originalDueDate,
            Instant requestedDueDate,
            String reason,
            String rejectReason
    ) {
        if (userId == null || userId.isBlank() || task == null) return;

        String actionUrl = getTaskActionUrl(task);

        Map<String, Object> metadata = buildTaskMetadata(task);
        putIfPresent(metadata, "requester_id", userId);
        putIfPresent(metadata, "requesterId", userId);
        metadata.put("current_due_date", originalDueDate);
        metadata.put("currentDueDate", originalDueDate);
        metadata.put("requested_due_date", requestedDueDate);
        metadata.put("requestedDueDate", requestedDueDate);
        metadata.put("reason", reason == null ? "" : reason);
        metadata.put("reject_reason", rejectReason == null ? "" : rejectReason);
        metadata.put("rejectReason", rejectReason == null ? "" : rejectReason);
        metadata.put("extension_status", "REJECTED");
        metadata.put("extensionStatus", "REJECTED");
        metadata.put("can_review", false);
        metadata.put("canReview", false);

        dispatch(userId, managerId, "Yêu cầu dời deadline bị từ chối",
                "Yêu cầu dời deadline công việc \"" + safeTaskTitle(task) + "\" đã bị từ chối.",
                null, "EXTENSION_REJECTED", task.getId(), "TASK", actionUrl, metadata, true);

        if (managerId != null && !managerId.isBlank() && !"SYSTEM_AUTO_REJECT".equals(managerId)) {
            dispatch(managerId, managerId, "Bạn đã từ chối dời deadline",
                    "Bạn đã từ chối yêu cầu dời deadline công việc: " + safeTaskTitle(task),
                    null, "EXTENSION_REJECTED_BY_YOU", task.getId(), "TASK", actionUrl, metadata, true);
        }
    }

    public void notifyExtensionRejected(String userId, String taskTitle, String currentDueDate, String managerReason) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("task_title", taskTitle);
        metadata.put("taskTitle", taskTitle);
        metadata.put("current_due_date", currentDueDate);
        metadata.put("currentDueDate", currentDueDate);
        metadata.put("reject_reason", managerReason == null ? "" : managerReason);
        metadata.put("rejectReason", managerReason == null ? "" : managerReason);
        metadata.put("extension_status", "REJECTED");
        metadata.put("extensionStatus", "REJECTED");

        dispatch(userId, null, "Yêu cầu dời deadline bị từ chối",
                "Yêu cầu dời deadline công việc \"" + taskTitle + "\" đã bị từ chối. Lý do: " + managerReason,
                null, "EXTENSION_REJECTED", null, "TASK", null, metadata, true);
    }

    private NotificationEntity dispatch(
            String recipientId,
            String senderId,
            String title,
            String message,
            String emailHtml,
            String type,
            String referenceId,
            String referenceType,
            String actionUrl,
            Map<String, Object> metadata,
            boolean emitRealtime
    ) {
        if (recipientId == null || recipientId.isBlank()) return null;
        if (!isUserExisting(recipientId)) return null;

        Object preferences = getPreferences(recipientId);

        if (DEADLINE_REMINDER_TYPES.contains(type)
                && !readBooleanPreference(preferences, true, "taskDeadlineReminders", "taskDeadlineRemindersEnabled")) {
            return null;
        }

        DispatchOutcome outcome = createOrFindNotification(
                recipientId,
                senderId,
                title,
                message,
                emailHtml,
                type,
                referenceId,
                referenceType,
                actionUrl,
                metadata
        );

        NotificationEntity notification = outcome.notification();
        if (!outcome.created()) return notification;

        boolean inAppEnabled = readBooleanPreference(
                preferences,
                true,
                "inAppNotificationsEnabled",
                "in_app_notifications_enabled",
                "pushNotifications",
                "pushNotificationsEnabled"
        );

        if (emitRealtime && inAppEnabled) emitRealtimeNotification(recipientId, notification);

        boolean emailEnabled = readBooleanPreference(
                preferences,
                true,
                "emailNotificationsEnabled",
                "email_notifications_enabled",
                "emailNotifications"
        );

        if (emailEnabled && shouldSendEmailImmediately(type)) {
            sendEmailSafely(recipientId, title, message, emailHtml);
        }

        return notification;
    }

    private DispatchOutcome createOrFindNotification(
            String recipientId,
            String senderId,
            String title,
            String message,
            String emailHtml,
            String type,
            String referenceId,
            String referenceType,
            String actionUrl,
            Map<String, Object> metadata
    ) {
        Map<String, Object> safeMetadata = metadata == null ? new LinkedHashMap<>() : new LinkedHashMap<>(metadata);
        String dedupeKey = buildDedupeKey(recipientId, senderId, type, referenceId, actionUrl, safeMetadata);

        if (dedupeKey != null) {
            Optional<NotificationEntity> existing = notificationRepository.findByDedupeKey(dedupeKey);
            if (existing.isPresent()) return new DispatchOutcome(existing.get(), false);
        }

        NotificationEntity notification = new NotificationEntity();
        notification.setRecipientId(recipientId);
        notification.setSenderId(senderId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReferenceId(referenceId);
        notification.setReferenceType(referenceType == null ? "TASK" : referenceType);
        notification.setActionUrl(actionUrl);
        notification.setMetadata(safeMetadata);
        notification.setEmailHtml(emailHtml);
        notification.setRead(false);
        notification.setStatus(NotificationStatus.SENT);
        notification.setSendAt(null);
        notification.setDedupeKey(dedupeKey);

        if (dedupeKey != null) {
            safeMetadata.put("dedupe_key", dedupeKey);
            safeMetadata.put("dedupeKey", dedupeKey);
            notification.setMetadata(safeMetadata);
        }

        try {
            return new DispatchOutcome(notificationRepository.save(notification), true);
        } catch (DuplicateKeyException duplicate) {
            if (dedupeKey != null) {
                return notificationRepository.findByDedupeKey(dedupeKey)
                        .map(existing -> new DispatchOutcome(existing, false))
                        .orElseThrow(() -> duplicate);
            }

            throw duplicate;
        }
    }

    private String buildDedupeKey(
            String recipientId,
            String senderId,
            String type,
            String referenceId,
            String actionUrl,
            Map<String, Object> metadata
    ) {
        String normalizedType = type == null ? "" : type.trim().toUpperCase();

        boolean shouldDedupe = normalizedType.startsWith("EXTENSION_")
                || normalizedType.contains("DEADLINE")
                || normalizedType.contains("OVERDUE");

        if (!shouldDedupe) return null;

        String taskId = firstNonBlank(
                referenceId,
                readMetadata(metadata, "task_id", "taskId"),
                parseTaskIdFromActionUrl(actionUrl)
        );

        String requesterId = readMetadata(metadata, "requester_id", "requesterId");
        String requestedDueDate = readMetadata(metadata, "requested_due_date", "requestedDueDate");
        String approvedDueDate = readMetadata(metadata, "approved_due_date", "approvedDueDate");
        String currentDueDate = readMetadata(metadata, "current_due_date", "currentDueDate", "due_date", "dueDate");
        String reviewKey = firstNonBlank(approvedDueDate, requestedDueDate, currentDueDate);

        return String.join("|",
                safe(recipientId),
                normalizedType,
                safe(taskId),
                safe(senderId),
                safe(requesterId),
                safe(reviewKey)
        );
    }

    private void emitRealtimeNotification(String recipientId, NotificationEntity notification) {
        if (recipientId == null || notification == null) return;

        Map<String, Object> payload = toClientPayload(notification);

        try {
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, payload);
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId + "/latest", payload);
        } catch (Exception error) {
            log.warn("Cannot emit websocket notification to user {}: {}", recipientId, error.getMessage());
        }

        CopyOnWriteArrayList<CompletableFuture<List<NotificationEntity>>> waiters = realtimeWaiters.remove(recipientId);
        if (waiters != null) {
            for (CompletableFuture<List<NotificationEntity>> waiter : waiters) {
                if (!waiter.isDone()) waiter.complete(List.of(notification));
            }
        }
    }

    private Map<String, Object> toClientPayload(NotificationEntity notification) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", notification.getId());
        payload.put("_id", notification.getId());
        payload.put("recipientId", notification.getRecipientId());
        payload.put("recipient_id", notification.getRecipientId());
        payload.put("senderId", notification.getSenderId());
        payload.put("sender_id", notification.getSenderId());
        payload.put("title", notification.getTitle());
        payload.put("message", notification.getMessage());
        payload.put("type", notification.getType());
        payload.put("referenceId", notification.getReferenceId());
        payload.put("reference_id", notification.getReferenceId());
        payload.put("referenceType", notification.getReferenceType());
        payload.put("reference_type", notification.getReferenceType());
        payload.put("actionUrl", notification.getActionUrl());
        payload.put("action_url", notification.getActionUrl());
        payload.put("metadata", notification.getMetadata());
        payload.put("timestamp", notification.getCreatedAt());
        payload.put("createdAt", notification.getCreatedAt());
        payload.put("created_at", notification.getCreatedAt());
        payload.put("updatedAt", notification.getUpdatedAt());
        payload.put("updated_at", notification.getUpdatedAt());
        payload.put("status", notification.getStatus() == null ? null : notification.getStatus().name());
        payload.put("isRead", notification.isRead());
        payload.put("is_read", notification.isRead());
        payload.put("dedupeKey", notification.getDedupeKey());
        payload.put("dedupe_key", notification.getDedupeKey());
        return payload;
    }

    private boolean shouldSendEmailImmediately(String type) {
        return IMMEDIATE_EMAIL_TYPES.contains(type) || DEADLINE_REMINDER_TYPES.contains(type);
    }

    private void sendEmailSafely(String recipientId, String title, String message, String emailHtml) {
        try {
            User user = userRepository.findById(recipientId).orElse(null);
            if (user == null || user.getEmail() == null || user.getEmail().isBlank()) return;

            String subject = "[Fluxboard] " + title;
            String html = emailHtml == null || emailHtml.isBlank()
                    ? buildHtmlEmail("#4F46E5", title, message)
                    : emailHtml;

            emailService.sendHtmlEmail(user.getEmail(), subject, html);
        } catch (Exception error) {
            log.warn("Cannot send notification email to user {}: {}", recipientId, error.getMessage());
        }
    }

    private TaskEntity getTask(String taskId) {
        if (taskId == null || taskId.isBlank()) return null;
        return taskRepository.findById(taskId).orElse(null);
    }

    private boolean isUserExisting(String userId) {
        try {
            return userRepository.findById(userId).isPresent();
        } catch (Exception error) {
            return false;
        }
    }

    private Object getPreferences(String userId) {
        try {
            return prefService.getPreferencesByUserId(userId);
        } catch (Exception error) {
            return null;
        }
    }

    private boolean readBooleanPreference(Object target, boolean defaultValue, String... methodNames) {
        if (target == null) return defaultValue;

        for (String methodName : methodNames) {
            try {
                Method method = target.getClass().getMethod(methodName);
                Object value = method.invoke(target);
                if (value instanceof Boolean bool) return bool;
            } catch (Exception ignored) {
            }
        }

        return defaultValue;
    }

    private Set<String> resolveTaskAssignees(TaskEntity task) {
        Set<String> recipients = new LinkedHashSet<>();
        Object assignees = readObject(task, "getAssigneesUserId", "getAssigneeUserIds", "getAssignees");

        if (assignees instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                String id = toIdString(item);
                if (id != null) recipients.add(id);
            }
        }

        addIfPresent(recipients, readString(task, "getAssigneeId", "getAssigneeUserId"));
        return recipients;
    }

    private Set<String> resolveTaskParticipants(TaskEntity task, String actorId) {
        Set<String> recipients = new LinkedHashSet<>(resolveTaskAssignees(task));
        addIfPresent(recipients, readString(task, "getAuthorUserId", "getCreatedBy", "getCreatedById"));
        addIfPresent(recipients, actorId);
        return recipients;
    }

    private void addIfPresent(Set<String> set, String value) {
        if (value != null && !value.isBlank()) set.add(value);
    }

    private Map<String, Object> buildTaskMetadata(TaskEntity task) {
        Map<String, Object> metadata = new LinkedHashMap<>();

        String taskId = task == null ? null : task.getId();
        String boardId = resolveBoardId(task);
        String actionUrl = buildActionUrl(boardId, taskId);
        String title = safeTaskTitle(task);
        Object priority = task == null ? null : readObject(task, "getPriority");
        Instant dueDate = task == null ? null : readInstant(task, "getDueDate", "getDueAt");

        putTaskNavigationMetadata(metadata, taskId, boardId, title);
        metadata.put("task_title", title);
        metadata.put("taskTitle", title);

        if (task != null) {
            putIfPresent(metadata, "column_id", task.getColumnId());
            putIfPresent(metadata, "columnId", task.getColumnId());
            putIfPresent(metadata, "project_id", task.getProjectId());
            putIfPresent(metadata, "projectId", task.getProjectId());
            putIfPresent(metadata, "action_url", actionUrl);
            putIfPresent(metadata, "actionUrl", actionUrl);
        }

        if (priority != null) metadata.put("priority", String.valueOf(priority));

        if (dueDate != null) {
            metadata.put("due_date", dueDate);
            metadata.put("dueDate", dueDate);
        }

        return metadata;
    }

    private void putTaskNavigationMetadata(Map<String, Object> metadata, String taskId, String boardId, String taskTitle) {
        putIfPresent(metadata, "task_id", taskId);
        putIfPresent(metadata, "taskId", taskId);
        putIfPresent(metadata, "board_id", boardId);
        putIfPresent(metadata, "boardId", boardId);
        putIfPresent(metadata, "task_title", taskTitle);
        putIfPresent(metadata, "taskTitle", taskTitle);
    }

    private void putIfPresent(Map<String, Object> metadata, String key, Object value) {
        if (metadata == null || key == null || value == null) return;
        if (value instanceof String str && str.isBlank()) return;
        metadata.put(key, value);
    }

    private String getTaskActionUrl(TaskEntity task) {
        if (task == null) return null;
        return buildActionUrl(resolveBoardId(task), task.getId());
    }

    private String resolveBoardId(TaskEntity task) {
        if (task == null) return null;

        String directBoardId = readString(task, "getBoardId", "getBoard_id");
        if (directBoardId != null && !directBoardId.isBlank()) return directBoardId;

        String columnId = task.getColumnId();
        if (columnId == null || columnId.isBlank()) return null;

        try {
            BoardColumnEntity column = boardColumnRepository.findByIdAndDeletedFalse(columnId).orElse(null);
            return column == null ? null : column.getBoardId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String buildActionUrl(String boardId, String taskId) {
        if (boardId == null || boardId.isBlank() || taskId == null || taskId.isBlank()) return null;
        return "/board/" + boardId + "?taskId=" + taskId;
    }

    private String safeTaskTitle(TaskEntity task) {
        if (task == null || task.getTitle() == null || task.getTitle().isBlank()) return "Không rõ công việc";
        return task.getTitle();
    }

    private String resolveUserDisplayName(String userId, String fallback) {
        if (userId == null || userId.isBlank()) return fallback;

        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) return fallback;
            if (user.getFullName() != null && !user.getFullName().isBlank()) return user.getFullName();
            if (user.getEmail() != null && !user.getEmail().isBlank()) return user.getEmail();
        } catch (Exception ignored) {
        }

        return fallback;
    }

    private boolean idsEqual(String a, String b) {
        return a != null && b != null && a.equals(b);
    }

    private String toIdString(Object value) {
        if (value == null) return null;
        if (value instanceof String str) return str;

        Object id = readObject(value, "getId");
        return id == null ? String.valueOf(value) : String.valueOf(id);
    }

    private String readString(Object target, String... methodNames) {
        Object value = readObject(target, methodNames);
        return value == null ? null : String.valueOf(value);
    }

    private Instant readInstant(Object target, String... methodNames) {
        Object value = readObject(target, methodNames);
        return value instanceof Instant instant ? instant : null;
    }

    private Object readObject(Object target, String... methodNames) {
        if (target == null) return null;

        for (String methodName : methodNames) {
            try {
                Method method = target.getClass().getMethod(methodName);
                return method.invoke(target);
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private String readMetadata(Map<String, Object> metadata, String... keys) {
        if (metadata == null) return "";

        for (String key : keys) {
            Object value = metadata.get(key);
            if (value != null && !String.valueOf(value).isBlank()) return String.valueOf(value);
        }

        return "";
    }

    private String parseTaskIdFromActionUrl(String actionUrl) {
        if (actionUrl == null || actionUrl.isBlank()) return "";

        int index = actionUrl.indexOf("taskId=");
        if (index < 0) return "";

        String value = actionUrl.substring(index + 7);
        int end = value.indexOf('&');
        return end >= 0 ? value.substring(0, end) : value;
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

    private String buildHtmlEmail(String themeColor, String title, String message) {
        String safeTitle = escapeHtml(title);
        String safeMessage = escapeHtml(message);

        return """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: %s; padding: 24px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Thông báo từ Fluxboard</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #333;">
                        <h2 style="color: #111827; margin-top: 0;">%s</h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">%s</p>
                    </div>
                    <div style="background-color: #f9fafb; padding: 18px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                        Đây là email tự động từ hệ thống Fluxboard. Vui lòng không trả lời email này.
                    </div>
                </div>
                """.formatted(themeColor, safeTitle, safeMessage);
    }

    private String escapeHtml(String value) {
        if (value == null) return "";

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#039;");
    }

    public String formatInstantForDisplay(Instant instant) {
        if (instant == null) return "Không rõ";

        return DateTimeFormatter
                .ofPattern("HH:mm dd/MM/yyyy")
                .withZone(ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(instant);
    }
}