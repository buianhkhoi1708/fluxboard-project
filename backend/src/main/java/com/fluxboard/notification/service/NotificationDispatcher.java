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
    
    // Khai báo TaskScheduler và bộ nhớ đệm phục vụ cơ chế Debounce
    private final TaskScheduler taskScheduler;
    private final Map<String, ScheduledFuture<?>> pendingNotifications = new ConcurrentHashMap<>();

    // ================== EVENT 1: ASSIGN TASK ==================
    public void notifyTaskAssigned(String userId, TaskEntity task) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);
        
        if (pref.inAppNotificationsEnabled()) { 
            String inAppMsg = "You have been assigned a new task: " + task.getTitle();
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, inAppMsg);
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
        dispatchUpcomingAlert(taskId); // Backward compatibility
    }

    public void dispatchUpcomingAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        List<String> assignees = task.getAssigneesUserId();
        for (String userId : assignees) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);

            if (pref.inAppNotificationsEnabled()) {
                String inAppMsg = "🚨 WARNING: Task '" + task.getTitle() + "' is approaching its deadline!";
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, inAppMsg);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "🚨 [Fluxboard] Deadline Warning!";
                String htmlBody = buildHtmlEmail(
                        "#dd6b20", "⚠️ Your task deadline is approaching!",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "This task is approaching its deadline. Please complete it as soon as possible!"
                );
                emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
            }
        }
    }

    // ================== EVENT 3: OVERDUE ==================
    public void dispatchOverdueAlert(String taskId) {
        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        List<String> assignees = task.getAssigneesUserId();
        for (String userId : assignees) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);

            if (pref.inAppNotificationsEnabled()) {
                String inAppMsg = "🛑 OVERDUE: Task '" + task.getTitle() + "' has missed its deadline!";
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, inAppMsg);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "🛑 [Fluxboard] Task Overdue!";
                String htmlBody = buildHtmlEmail(
                        "#e53e3e", "🛑 Task Missed Deadline!",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "This task has passed its due date and is now marked as OVERDUE."
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
            log.info("Canceled previous notification timer for Task: {}", taskId);
        }

        // 10 phút = 600 giây
        Instant scheduledTime = Instant.now().plusSeconds(10 * 60); 

        ScheduledFuture<?> newTimer = taskScheduler.schedule(
            () -> executeDeadlineUpdatedNotification(taskId), 
            scheduledTime
        );

        pendingNotifications.put(taskId, newTimer);
        log.info("Scheduled new notification timer for Task: {} at {}", taskId, scheduledTime);
    }

    private void executeDeadlineUpdatedNotification(String taskId) {
        pendingNotifications.remove(taskId);

        TaskEntity task = taskRepository.findById(taskId).orElse(null);
        if (task == null || task.getAssigneesUserId() == null) return;

        for (String userId : task.getAssigneesUserId()) {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) continue;

            UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);

            if (pref.inAppNotificationsEnabled()) {
                String inAppMsg = "The deadline configuration for task '" + task.getTitle() + "' has been finalized and updated.";
                messagingTemplate.convertAndSend("/topic/notifications/" + userId, inAppMsg);
            }

            if (pref.emailNotificationsEnabled()) {
                String subject = "📅 [Fluxboard] Task Deadline Updated";
                String htmlBody = buildHtmlEmail(
                        "#3182ce", "📅 Task Deadline Updated",
                        task.getTitle(), String.valueOf(task.getPriority()),
                        "The deadline configuration for this task has been modified by the manager."
                );
                emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
            }
        }
    }

    private String buildHtmlEmail(String themeColor, String header, String taskTitle, String priority, String footerMsg) {
        return "<div style=\"font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6;\">" +
               "  <div style=\"max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);\">" +
               "    <h2 style=\"color: " + themeColor + "; border-bottom: 2px solid #edf2f7; padding-bottom: 10px;\">" + header + "</h2>" +
               "    <p style=\"font-size: 16px; color: #333;\">Hello,</p>" +
               "    <p style=\"font-size: 16px; color: #333;\">This is an automated notification from Fluxboard:</p>" +
               "    <div style=\"background-color: #f8fafc; padding: 15px; border-left: 5px solid " + themeColor + "; margin: 20px 0; border-radius: 4px;\">" +
               "      <p style=\"margin: 5px 0; font-size: 15px;\"><strong>Task Name:</strong> <span style=\"color: #2d3748;\">" + taskTitle + "</span></p>" +
               "      <p style=\"margin: 5px 0; font-size: 15px;\"><strong>Priority:</strong> <span style=\"color: #2d3748;\">" + priority + "</span></p>" +
               "    </div>" +
               "    <p style=\"font-size: 15px; color: #4a5568;\">" + footerMsg + "</p>" +
               "    <br/>" +
               "    <p style=\"font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; padding-top: 15px;\">Please do not reply to this automated email.</p>" +
               "  </div>" +
               "</div>";
    }
}