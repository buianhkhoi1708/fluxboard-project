package com.fluxboard.notification.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.email.service.EmailService;
import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.repository.NotificationRepository;
import com.fluxboard.user.dto.response.UserNotificationPrefResponse;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.user.service.UserNotificationPrefService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationDispatcher {

    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserNotificationPrefService prefService;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationDebounceService debounceService;
    private final TaskScheduler taskScheduler;
    
    private final Map<String, ScheduledFuture<?>> pendingNotifications = new ConcurrentHashMap<>();

    public void dispatchTaskCreatedNotification(String recipientId, String taskId, String taskName, String boardId) {
        debounceService.debounceCreateTask(taskId, recipientId, () -> {
            NotificationEntity notif = createNotificationRecord(recipientId, "TASK_CREATED", 
                    "Công việc mới được tạo", "Thẻ công việc '" + taskName + "' đã được khởi tạo.", 
                    Map.of("taskId", taskId, "boardId", boardId));
            
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, notif);
            sendBackupEmail(recipientId, "New Task Created", "A new task has been initialized: " + taskName, "#2b6cb0");
        }, 600000); // 10 phút
    }

    /**
     * 🚀 ĐÃ CẬP NHẬT CHUẨN: Hàm tiếp nhận sự kiện Thay đổi từ Listener, tự bóc tách thông minh dựa vào trạng thái columnId thay đổi
     */
    public void dispatchTaskChangedNotification(String recipientId, String taskId, String taskName, String currentColumnId, String boardId) {
        // Query nhanh database để check xem hành động này là kéo thả hay chỉnh sửa chữ
        TaskEntity currentTask = taskRepository.findById(taskId).orElse(null);
        
        String finalType = "TASK_UPDATED";
        String finalTitle = "Cập nhật dữ liệu công việc";
        String finalMessage = "Nội dung chi tiết của thẻ '" + taskName + "' vừa được chỉnh sửa.";
        String themeColor = "#4a5568";

        if (currentTask != null && !currentColumnId.equals(currentTask.getColumnId())) {
            finalType = "TASK_MOVED";
            finalTitle = "Thay đổi trạng thái công việc";
            finalMessage = "Thẻ '" + taskName + "' đã được kéo thả di chuyển sang cột mới.";
            themeColor = "#3182ce";
        }

        final String type = finalType;
        final String title = finalTitle;
        final String message = finalMessage;
        final String color = themeColor;

        debounceService.debounceUpdateOrMove(taskId, recipientId, type, () -> {
            NotificationEntity notif = createNotificationRecord(recipientId, type, title, message, Map.of("taskId", taskId, "boardId", boardId));
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, notif);
            sendBackupEmail(recipientId, title, message, color);
        }, 60000); // 1 phút
    }

    public void notifyTaskAssigned(String userId, TaskEntity task) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
        String msgContent = "Bạn đã được gán vào công việc mới: '" + task.getTitle() + "'.";
        NotificationEntity notif = createNotificationRecord(userId, "TASK_ASSIGNED", "Giao việc mới", msgContent, Map.of("taskId", task.getId()));
        if (pref.inAppNotificationsEnabled()) messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        if (pref.emailNotificationsEnabled()) {
            emailService.sendHtmlEmail(user.getEmail(), "🔔 [Fluxboard] Task Assigned", buildHtmlEmail("#2b6cb0", "New Task Assigned!", task.getTitle(), String.valueOf(task.getPriority()), "You have been added to a task."));
        }
    }

    public void notifyTaskDeadline(String taskId) { dispatchUpcomingAlert(taskId); }
    public void dispatchUpcomingAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;
        for (String userId : task.getAssigneesUserId()) {
            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
            NotificationEntity notif = createNotificationRecord(userId, "DEADLINE_APPROACHING", "Công việc sắp đến hạn", "Công việc '" + task.getTitle() + "' sắp đến hạn chót!", Map.of("taskId", taskId));
            if (pref.inAppNotificationsEnabled()) messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }
    }

    public void dispatchOverdueAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;
        for (String userId : task.getAssigneesUserId()) {
            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
            NotificationEntity notif = createNotificationRecord(userId, "TASK_OVERDUE", "Cảnh báo quá hạn", "Công việc '" + task.getTitle() + "' đã quá hạn chót!", Map.of("taskId", taskId));
            if (pref.inAppNotificationsEnabled()) messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }
    }

    public void scheduleDeadlineUpdateNotification(String taskId) {
        ScheduledFuture<?> existingTimer = pendingNotifications.get(taskId);
        if (existingTimer != null && !existingTimer.isDone()) existingTimer.cancel(false);
        ScheduledFuture<?> newTimer = taskScheduler.schedule(() -> executeDeadlineUpdatedNotification(taskId), Instant.now().plusSeconds(600));
        pendingNotifications.put(taskId, newTimer);
    }

    private void executeDeadlineUpdatedNotification(String taskId) {
        pendingNotifications.remove(taskId);
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;
        for (String userId : task.getAssigneesUserId()) {
            NotificationEntity notif = createNotificationRecord(userId, "DEADLINE_UPDATED", "Thay đổi cấu hình thời gian", "Cấu hình thời gian của '" + task.getTitle() + "' vừa được cập nhật.", Map.of("taskId", taskId));
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }
    }

    public void notifyExtensionApproved(String userId, String taskTitle, String newDueDate) {
        NotificationEntity notif = createNotificationRecord(userId, "EXTENSION_APPROVED", "Yêu cầu gia hạn được chấp nhận", "Yêu cầu gia hạn công việc '" + taskTitle + "' đã được duyệt thành công.", Map.of("taskTitle", taskTitle));
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
    }

    public void notifyExtensionRejected(String userId, String taskTitle, String currentDueDate, String managerReason) {
        NotificationEntity notif = createNotificationRecord(userId, "EXTENSION_REJECTED", "Yêu cầu gia hạn bị từ chối", "Yêu cầu gia hạn công việc '" + taskTitle + "' bị từ chối. Lý do: " + managerReason, Map.of("taskTitle", taskTitle));
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
    }

    public void notifyExtensionRequested(String managerId, String requesterName, String taskTitle, String requestedDueDate, String reason) {
        NotificationEntity notif = createNotificationRecord(managerId, "EXTENSION_REQUESTED", "Yêu cầu xin gia hạn mới", requesterName + " xin gia hạn công việc '" + taskTitle + "'.", Map.of("taskTitle", taskTitle));
        messagingTemplate.convertAndSend("/topic/notifications/" + managerId, notif);
    }

    private NotificationEntity createNotificationRecord(String recipientId, String type, String title, String message, Map<String, Object> metadata) {
        NotificationEntity notif = new NotificationEntity();
        notif.setRecipientId(recipientId);
        notif.setType(type);
        notif.setTitle(title);
        notif.setMessage(message);
        notif.setMetadata(metadata);
        notif.setRead(false);
        return notificationRepository.save(notif);
    }

    private void sendBackupEmail(String recipientId, String subject, String bodyText, String color) {
        try {
            User user = userRepository.findByIdAndDeletedFalse(recipientId).orElse(null);
            if (user != null && user.getEmail() != null) {
                emailService.sendHtmlEmail(user.getEmail(), "[Fluxboard] " + subject, buildHtmlEmail(color, subject, "Fluxboard Task", "Normal", bodyText));
            }
        } catch (Exception ignored) {}
    }

    private String buildHtmlEmail(String themeColor, String title, String taskTitle, String priority, String description) {
        return "<div style=\"font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6;\">" +
               "  <div style=\"max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid " + themeColor + ";\">" +
               "    <h2 style=\"color: " + themeColor + "; margin-top: 0;\">" + title + "</h2>" +
               "    <p style=\"font-size: 14px; color: #4a5568;\"><strong>Task:</strong> " + taskTitle + "</p>" +
               "    <p style=\"font-size: 14px; color: #4a5568;\">" + description + "</p>" +
               "  </div>" +
               "</div>";
    }
}