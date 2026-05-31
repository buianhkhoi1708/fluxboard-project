package com.fluxboard.notification.listener;

import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.event.TaskCreatedEvent;
import com.fluxboard.board.task.event.TaskUpdatedEvent;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.deadline.event.ExtensionApprovedEvent;
import com.fluxboard.deadline.event.ExtensionRejectedEvent;
import com.fluxboard.deadline.event.ExtensionRequestedEvent;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class NotificationListener {
    private final NotificationDispatcher notificationDispatcher;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    @Async
    @EventListener
    public void handleTaskCreated(TaskCreatedEvent event) {
        String taskId = readString(event, "getTaskId", "taskId");
        String actorId = readString(event, "getActorUserId", "getUserId", "getCreatedBy", "getSenderId");
        notificationDispatcher.dispatchTaskCreated(taskId, actorId);
    }

    @Async
    @EventListener
    public void handleTaskUpdated(TaskUpdatedEvent event) {
        String taskId = readString(event, "getTaskId", "taskId");
        String actorId = readString(event, "getActorUserId", "getUserId", "getUpdatedBy", "getSenderId");
        String eventType = readString(event, "getType", "getEventType");
        String destinationColumnId = readString(event, "getDestinationColumnId", "getDestColumnId", "getColumnId");
        String destinationColumnName = readString(event, "getDestinationColumnName", "getDestColumnName", "getColumnName");

        if (isCompletedEvent(eventType, event)) {
            notificationDispatcher.dispatchTaskCompleted(taskId, actorId);
            return;
        }

        if (isMoveEvent(eventType, event, destinationColumnId, destinationColumnName)) {
            notificationDispatcher.dispatchTaskMoved(taskId, actorId, destinationColumnId, destinationColumnName);
            return;
        }

        notificationDispatcher.dispatchTaskUpdated(taskId, actorId);
    }

    @Async
    @EventListener
    public void handleExtensionRequested(ExtensionRequestedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        User requester = userRepository.findById(event.getRequesterId()).orElse(null);

        if (task == null || requester == null) return;

        Instant currentDueDate = readInstant(event, "getCurrentDueDate", "getOriginalDueDate");
        Instant requestedDueDate = event.getRequestedDueDate();
        String requesterName = requester.getFullName() != null && !requester.getFullName().isBlank()
                ? requester.getFullName()
                : requester.getEmail();

        notificationDispatcher.notifyExtensionRequested(
                event.getTargetManagerId(),
                event.getRequesterId(),
                requesterName,
                task,
                currentDueDate,
                requestedDueDate,
                event.getReason()
        );
    }

    @Async
    @EventListener
    public void handleExtensionApproved(ExtensionApprovedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        if (task == null) return;

        String managerId = readString(event, "getManagerId", "getReviewerId", "getUserId", "getSenderId");
        Instant originalDueDate = readInstant(event, "getOriginalDueDate", "getCurrentDueDate", "getOldDueDate");
        Instant newDueDate = event.getNewDueDate();
        String reason = readString(event, "getReason", "getRequestReason");

        for (String userId : safeTargets(event.getTargetUserIds(), event.getRequesterId(), task)) {
            notificationDispatcher.notifyExtensionApproved(
                    userId,
                    managerId,
                    task,
                    originalDueDate,
                    newDueDate,
                    reason
            );
        }
    }

    @Async
    @EventListener
    public void handleExtensionRejected(ExtensionRejectedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        if (task == null) return;

        String managerId = readString(event, "getManagerId", "getReviewerId", "getUserId", "getSenderId");
        Instant originalDueDate = event.getCurrentDueDate();
        Instant requestedDueDate = readInstant(event, "getRequestedDueDate", "getNewDueDate", "getPendingDueDate");
        String reason = readString(event, "getReason", "getRequestReason");
        String rejectReason = event.getManagerReason();

        for (String userId : safeTargets(event.getTargetUserIds(), event.getRequesterId(), task)) {
            notificationDispatcher.notifyExtensionRejected(
                    userId,
                    managerId,
                    task,
                    originalDueDate,
                    requestedDueDate,
                    reason,
                    rejectReason
            );
        }
    }

    private List<String> safeTargets(List<String> eventTargets, String requesterId, TaskEntity task) {
        List<String> targets = new ArrayList<>();

        if (eventTargets != null) {
            for (String id : eventTargets) {
                if (id != null && !id.isBlank() && !targets.contains(id)) targets.add(id);
            }
        }

        if (requesterId != null && !requesterId.isBlank() && !targets.contains(requesterId)) {
            targets.add(requesterId);
        }

        if (targets.isEmpty() && task.getAssigneesUserId() != null) {
            for (String id : task.getAssigneesUserId()) {
                if (id != null && !id.isBlank() && !targets.contains(id)) targets.add(id);
            }
        }

        return targets;
    }

    private boolean isCompletedEvent(String eventType, Object event) {
        if (eventType != null) {
            String normalized = eventType.trim().toUpperCase();
            if (normalized.contains("COMPLETE") || normalized.contains("DONE")) return true;
        }

        String status = readString(event, "getStatus", "getNewStatus", "getToStatus");
        return status != null && "DONE".equalsIgnoreCase(status.trim());
    }

    private boolean isMoveEvent(String eventType, Object event, String destinationColumnId, String destinationColumnName) {
        if (eventType != null) {
            String normalized = eventType.trim().toUpperCase();
            if (normalized.contains("MOVE") || normalized.contains("COLUMN")) return true;
        }

        if (destinationColumnId != null && !destinationColumnId.isBlank()) return true;
        if (destinationColumnName != null && !destinationColumnName.isBlank()) return true;

        String oldColumnId = readString(event, "getOldColumnId", "getSourceColumnId", "getFromColumnId");
        String newColumnId = readString(event, "getNewColumnId", "getDestinationColumnId", "getToColumnId");

        return oldColumnId != null && newColumnId != null && !oldColumnId.equals(newColumnId);
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
}