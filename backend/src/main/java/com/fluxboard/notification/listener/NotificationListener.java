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

        if (task == null || requester == null) {
            return;
        }

        Instant currentDueDate = readInstant(event, "getCurrentDueDate", "getOriginalDueDate");
        Instant requestedDueDate = event.getRequestedDueDate();

        notificationDispatcher.notifyExtensionRequested(
                event.getTargetManagerId(),
                event.getRequesterId(),
                requester.getFullName() != null ? requester.getFullName() : requester.getEmail(),
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

        if (task == null) {
            return;
        }

        String managerId = readString(event, "getManagerId", "getReviewerId", "getUserId", "getSenderId");
        Instant originalDueDate = readInstant(event, "getOriginalDueDate", "getCurrentDueDate");
        Instant newDueDate = event.getNewDueDate();
        String reason = readString(event, "getReason", "getRequestReason");

        for (String userId : event.getTargetUserIds()) {
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

        if (task == null) {
            return;
        }

        String managerId = readString(event, "getManagerId", "getReviewerId", "getUserId", "getSenderId");
        Instant originalDueDate = event.getCurrentDueDate();
        Instant requestedDueDate = readInstant(event, "getRequestedDueDate", "getNewDueDate", "getPendingDueDate");
        String reason = readString(event, "getReason", "getRequestReason");
        String rejectReason = event.getManagerReason();

        List<String> targetUserIds = event.getTargetUserIds();

        for (String userId : targetUserIds) {
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

    private boolean isCompletedEvent(String eventType, Object event) {
        if (eventType != null && eventType.toUpperCase().contains("COMPLETE")) {
            return true;
        }

        Object isDone = readObject(event, "isDone", "getIsDone", "getDone", "isCompleted", "getCompleted");

        if (isDone instanceof Boolean bool) {
            return bool;
        }

        String status = readString(event, "getStatus", "getNewStatus");

        return status != null && (
                status.equalsIgnoreCase("DONE")
                        || status.equalsIgnoreCase("COMPLETED")
                        || status.equalsIgnoreCase("COMPLETE")
        );
    }

    private boolean isMoveEvent(
            String eventType,
            Object event,
            String destinationColumnId,
            String destinationColumnName
    ) {
        if (eventType != null) {
            String normalized = eventType.toUpperCase();

            if (normalized.contains("MOVE") || normalized.contains("COLUMN") || normalized.contains("STATUS")) {
                return true;
            }
        }

        if (destinationColumnId != null || destinationColumnName != null) {
            return true;
        }

        String fromColumn = readString(event, "getSourceColumnId", "getFromColumnId");
        String toColumn = readString(event, "getDestColumnId", "getDestinationColumnId", "getToColumnId");

        return fromColumn != null || toColumn != null;
    }

    private String readString(Object target, String... methodNames) {
        Object value = readObject(target, methodNames);
        return value == null ? null : String.valueOf(value);
    }

    private Instant readInstant(Object target, String... methodNames) {
        Object value = readObject(target, methodNames);

        if (value instanceof Instant instant) {
            return instant;
        }

        return null;
    }

    private Object readObject(Object target, String... methodNames) {
        if (target == null) {
            return null;
        }

        for (String methodName : methodNames) {
            try {
                Method method = target.getClass().getMethod(methodName);
                return method.invoke(target);
            } catch (Exception ignored) {
                // Try next method.
            }
        }

        return null;
    }
}