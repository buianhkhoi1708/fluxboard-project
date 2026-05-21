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
    
    // Bộ nhớ đệm phục vụ cơ chế hoãn 10 phút cũ cho Deadline Config để tránh mất logic nguyên bản
    private final Map<String, ScheduledFuture<?>> pendingNotifications = new ConcurrentHashMap<>();

    /**
     * 🔥 TÍNH NĂNG MỚI: Kích hoạt thông báo khi Task bị thay đổi vị trí/trạng thái.
     * Sẽ delay đúng 1 phút để chống Spam dồn dập dữ liệu.
     */
    public void dispatchTaskMovedNotification(String recipientId, String taskId, String taskName, String boardId) {
        String debounceKey = "TASK_MOVED_" + taskId + "_" + recipientId;

        debounceService.debounce(debounceKey, () -> {
            log.info("Chốt hạ hành động: Thực thi gửi thông báo TASK_MOVED tới người dùng: {}", recipientId);

            NotificationEntity notif = createNotificationRecord(recipientId, "TASK_MOVED", 
                    "Cập nhật công việc", 
                    "Thẻ '" + taskName + "' đã được cập nhật vị trí hoặc trạng thái trên bảng.", 
                    Map.of("taskId", taskId, "boardId", boardId));

            // Đẩy realtime qua kênh WebSocket dùng chung của dự án
            messagingTemplate.convertAndSend("/topic/notifications/" + recipientId, notif);

            try {
                User user = userRepository.findByIdAndDeletedFalse(recipientId).orElse(null);
                if (user != null && user.getEmail() != null) {
                    String emailHtml = buildHtmlEmail("#3182ce", "Task Position Changed", taskName, "N/A", 
                            "The position or status of this task has been rearranged on the Kanban Board.");
                    emailService.sendHtmlEmail(user.getEmail(), "[Fluxboard] Task Updated: " + taskName, emailHtml);
                }
            } catch (Exception e) {
                log.error("Lỗi luồng gửi mail phụ trợ TASK_MOVED: ", e);
            }
        }, 60000);
    }

    // ================== EVENT 1: ASSIGN TASK (Khôi phục nguyên bản) ==================
    public void notifyTaskAssigned(String userId, TaskEntity task) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
        String msgContent = "Bạn đã được gán vào công việc mới: '" + task.getTitle() + "'.";
        
        // Đồng bộ lưu vết thông báo vào MongoDB Database
        NotificationEntity notif = createNotificationRecord(userId, "TASK_ASSIGNED", "Giao việc mới", msgContent, Map.of("taskId", task.getId()));

        if (pref.inAppNotificationsEnabled()) { 
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }

        if (pref.emailNotificationsEnabled()) {
            String subject = "🔔 [Fluxboard] You have a new task assigned!";
            String htmlBody = buildHtmlEmail(
                    "#2b6cb0", "🚀 New Task Assigned!",
                    task.getTitle(), String.valueOf(task.getPriority()),
                    "Please log in to Fluxboard to view details and start working."
            );
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
        }
    }

    // ================== EVENT 2: DEADLINE APPROACHING ==================
    public void notifyTaskDeadline(String taskId) {
        dispatchUpcomingAlert(taskId); // Giữ tính tương thích ngược
    }

    public void dispatchUpcomingAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        for (String userId : task.getAssigneesUserId()) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
            String msgContent = "Cảnh báo: Công việc '" + task.getTitle() + "' đang sắp đến hạn chót!";
            
            NotificationEntity notif = createNotificationRecord(userId, "DEADLINE_APPROACHING", "Công việc sắp đến hạn", msgContent, Map.of("taskId", taskId));

            if (pref.inAppNotificationsEnabled()) {
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "🚨 [Fluxboard] Deadline Warning!";
                String htmlBody = buildHtmlEmail(
                        "#dd6b20", "⚠️ Your task deadline is approaching!",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "This task is approaching its final deadline. Please review your dashboard and complete it soon."
                );
                emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
            }
        }
    }

    // ================== EVENT 3: TASK OVERDUE ==================
    public void dispatchOverdueAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        for (String userId : task.getAssigneesUserId()) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
            String msgContent = "Trễ hạn: Công việc '" + task.getTitle() + "' đã vượt quá thời hạn quy định nhưng chưa hoàn thành!";
            
            NotificationEntity notif = createNotificationRecord(userId, "TASK_OVERDUE", "Cảnh báo quá hạn", msgContent, Map.of("taskId", taskId));

            if (pref.inAppNotificationsEnabled()) {
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "🛑 [Fluxboard] Task Overdue!";
                String htmlBody = buildHtmlEmail(
                        "#e53e3e", "🛑 Task Missed Deadline!",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "CRITICAL: This task has passed its due date and is now marked as OVERDUE."
                );
                emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
            }
        }
    }

    // ================== EVENT 4: DEADLINE CONFIG UPDATED (DEBOUNCED 10 MINS) ==================
    public void scheduleDeadlineUpdateNotification(String taskId) {
        ScheduledFuture<?> existingTimer = pendingNotifications.get(taskId);
        if (existingTimer != null && !existingTimer.isDone()) {
            existingTimer.cancel(false);
        }

        ScheduledFuture<?> newTimer = taskScheduler.schedule(
                () -> executeDeadlineUpdatedNotification(taskId),
                Instant.now().plusSeconds(600) // Hoãn đúng 10 phút như logic gốc của bạn
        );
        pendingNotifications.put(taskId, newTimer);
        log.info("Scheduled deadline updated notification timer for Task: {}", taskId);
    }

    private void executeDeadlineUpdatedNotification(String taskId) {
        pendingNotifications.remove(taskId);
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        for (String userId : task.getAssigneesUserId()) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
            String msgContent = "Cấu hình thời gian công việc '" + task.getTitle() + "' vừa được cập nhật thay đổi.";
            
            NotificationEntity notif = createNotificationRecord(userId, "DEADLINE_UPDATED", "Thay đổi cấu hình thời gian", msgContent, Map.of("taskId", taskId));

            if (pref.inAppNotificationsEnabled()) {
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "📅 [Fluxboard] Deadline Configuration Updated";
                String htmlBody = buildHtmlEmail(
                        "#4a5568", "📅 Task Deadline Updated",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "The timing configuration for this task has been adjusted by your team leader."
                );
                emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
            }
        }
    }

    // ================== EVENT 5: EXTENSION APPROVED (Khớp nối Listener) ==================
    public void notifyExtensionApproved(String userId, String taskTitle, String newDueDate) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
        String msgContent = "Yêu cầu xin lùi hạn chót công việc '" + taskTitle + "' đã được phê duyệt đến ngày " + newDueDate;
        
        NotificationEntity notif = createNotificationRecord(userId, "EXTENSION_APPROVED", "Yêu cầu gia hạn được chấp nhận", msgContent, Map.of("taskTitle", taskTitle));

        if (pref.inAppNotificationsEnabled()) {
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }

        if (pref.emailNotificationsEnabled()) {
            String subject = "✅ [Fluxboard] Extension Request Approved!";
            String htmlBody = buildHtmlEmail(
                    "#38a169", "✅ Extension Request Approved!",
                    taskTitle, "N/A",
                    "Great news! Your manager has approved your request to extend the deadline for this task to: " + newDueDate
            );
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
        }
    }

    // ================== EVENT 6: EXTENSION REJECTED (Khớp nối Listener) ==================
    public void notifyExtensionRejected(String userId, String taskTitle, String currentDueDate, String managerReason) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
        String msgContent = "Yêu cầu lùi hạn công việc '" + taskTitle + "' đã bị từ chối. Lý do: " + managerReason;
        
        NotificationEntity notif = createNotificationRecord(userId, "EXTENSION_REJECTED", "Yêu cầu gia hạn bị từ chối", msgContent, Map.of("taskTitle", taskTitle));

        if (pref.inAppNotificationsEnabled()) {
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, notif);
        }

        if (pref.emailNotificationsEnabled()) {
            String subject = "❌ [Fluxboard] Extension Request Rejected";
            String htmlBody = buildHtmlEmail(
                    "#e53e3e", "❌ Extension Request Rejected",
                    taskTitle, "N/A",
                    "Your request for extending deadline has been rejected by manager. Reason: " + managerReason
            );
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
        }
    }

    // ================== EVENT 7: EXTENSION REQUESTED (Khớp nối Listener) ==================
    public void notifyExtensionRequested(String managerId, String requesterName, String taskTitle, String requestedDueDate, String reason) {
        User manager = userRepository.findById(managerId).orElse(null);
        if (manager == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(managerId);
        String msgContent = "Thành viên " + requesterName + " vừa gửi yêu cầu xin dời hạn cho công việc '" + taskTitle + "' đến ngày " + requestedDueDate;
        
        NotificationEntity notif = createNotificationRecord(managerId, "EXTENSION_REQUESTED", "Yêu cầu xin gia hạn mới", msgContent, Map.of("taskTitle", taskTitle));

        if (pref.inAppNotificationsEnabled()) {
            messagingTemplate.convertAndSend("/topic/notifications/" + managerId, notif);
        }

        if (pref.emailNotificationsEnabled()) {
            String subject = "⏳ [Fluxboard] New Extension Request Pending";
            String htmlBody = buildHtmlEmail(
                    "#dd6b20", "⏳ Extension Requested",
                    taskTitle, "N/A",
                    requesterName + " has submitted an extension request to " + requestedDueDate + ". Reason: " + reason
            );
            emailService.sendHtmlEmail(manager.getEmail(), subject, htmlBody);
        }
    }

    // ================== PRIVATE HELPER METHODS ==================
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

    private String buildHtmlEmail(String themeColor, String title, String taskTitle, String priority, String description) {
        return "<div style=\"font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6;\">" +
               "  <div style=\"max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid " + themeColor + ";\">" +
               "    <h2 style=\"color: " + themeColor + "; margin-top: 0;\">" + title + "</h2>" +
               "    <p style=\"font-size: 16px; color: #333;\">Hello,</p>" +
               "    <div style=\"background-color: #f8fafc; padding: 15px; border-left: 5px solid " + themeColor + "; margin: 20px 0; border-radius: 4px;\">" +
               "      <p style=\"margin: 5px 0;\"><strong>Task Name:</strong> " + taskTitle + "</p>" +
               "      <p style=\"margin: 5px 0;\"><strong>Priority:</strong> " + priority + "</p>" +
               "      <p style=\"margin: 10px 0 0 0; color: #4a5568; line-height: 1.5;\">" + description + "</p>" +
               "    </div>" +
               "    <p style=\"font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 15px;\">This is an automated message from Fluxboard. Please do not reply to this email.</p>" +
               "  </div>" +
               "</div>";
    }
}