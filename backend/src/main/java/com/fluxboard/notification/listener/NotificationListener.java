package com.fluxboard.notification.listener;

import com.fluxboard.board.task.entity.TaskEntity;
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

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationDispatcher notificationDispatcher;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    // Định dạng: 17:00 10/05/2026 (Múi giờ Việt Nam UTC+7)
    private static final DateTimeFormatter DATE_FORMATTER = 
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
                             .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private String formatTime(Instant instant) {
        return instant != null ? DATE_FORMATTER.format(instant) : "N/A";
    }

    @Async
    @EventListener
    public void handleExtensionRequested(ExtensionRequestedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        User requester = userRepository.findById(event.getRequesterId()).orElse(null);
        
        if (task != null && requester != null) {
            notificationDispatcher.notifyExtensionRequested(
                    event.getTargetManagerId(),
                    requester.getFullName(),
                    task.getTitle(),
                    formatTime(event.getRequestedDueDate()), 
                    event.getReason()
            );
        }
    }

    @Async
    @EventListener
    public void handleExtensionApproved(ExtensionApprovedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        if (task != null) {
            String friendlyDate = formatTime(event.getNewDueDate()); 
            for (String userId : event.getTargetUserIds()) {
                notificationDispatcher.notifyExtensionApproved(
                        userId,
                        task.getTitle(),
                        friendlyDate
                );
            }
        }
    }

    @Async
    @EventListener
    public void handleExtensionRejected(ExtensionRejectedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        if (task != null) {
            String friendlyDate = formatTime(event.getCurrentDueDate()); 
            for (String userId : event.getTargetUserIds()) {
                notificationDispatcher.notifyExtensionRejected(
                        userId,
                        task.getTitle(),
                        friendlyDate,
                        event.getManagerReason()
                );
            }
        }
    }
}