package com.fluxboard.notification.listener;

import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.board.task.event.TaskCreatedEvent;
import com.fluxboard.board.task.event.TaskUpdatedEvent;
import com.fluxboard.deadline.event.ExtensionApprovedEvent;
import com.fluxboard.deadline.event.ExtensionRejectedEvent;
import com.fluxboard.deadline.event.ExtensionRequestedEvent;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationDispatcher notificationDispatcher;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final BoardColumnRepository boardColumnRepository; // 🚀 Inject để lấy boardId

    private static final DateTimeFormatter DATE_FORMATTER = 
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private String formatTime(Instant instant) {
        return instant != null ? DATE_FORMATTER.format(instant) : "N/A";
    }

    private String getBoardIdFromColumn(String columnId) {
        return boardColumnRepository.findById(columnId)
                .map(column -> column.getBoardId())
                .orElse(null);
    }

    @Async
    @EventListener
    public void handleTaskCreated(TaskCreatedEvent event) {
        String taskId = event.getTaskId();
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;
        
        String boardId = getBoardIdFromColumn(task.getColumnId());
        log.info("Bắt được sự kiện Tạo mới Task ID: {}. Đưa vào hàng chờ 10 phút.", taskId);
        for (String userId : task.getAssigneesUserId()) {
            notificationDispatcher.dispatchTaskCreatedNotification(userId, task.getId(), task.getTitle(), boardId);
        }
    }

    @Async
    @EventListener
    public void handleTaskUpdated(TaskUpdatedEvent event) {
        String taskId = event.getTaskId();
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        String boardId = getBoardIdFromColumn(task.getColumnId());
        log.info("Bắt được sự kiện Thay đổi Task ID: {}. Tiến hành định tuyến.", taskId);
        
        String currentColumnId = task.getColumnId() != null ? task.getColumnId() : "";

        for (String userId : task.getAssigneesUserId()) {
            notificationDispatcher.dispatchTaskChangedNotification(
                    userId, 
                    task.getId(), 
                    task.getTitle(), 
                    currentColumnId, 
                    boardId
            );
        }
    }

    // [Giữ nguyên logic handleExtension... như cũ]
    @Async
    @EventListener
    public void handleExtensionRequested(ExtensionRequestedEvent event) {
        TaskEntity task = taskRepository.findById(event.getTaskId()).orElse(null);
        User requester = userRepository.findById(event.getRequesterId()).orElse(null);
        if (task != null && requester != null) {
            notificationDispatcher.notifyExtensionRequested(
                    event.getTargetManagerId(), requester.getFullName(), task.getTitle(),
                    formatTime(event.getRequestedDueDate()), event.getReason()
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
                notificationDispatcher.notifyExtensionApproved(userId, task.getTitle(), friendlyDate);
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
                notificationDispatcher.notifyExtensionRejected(userId, task.getTitle(), friendlyDate, event.getManagerReason());
            }
        }
    }
}