package com.fluxboard.notification.service;

import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.email.service.EmailService;
import com.fluxboard.user.dto.response.UserNotificationPrefResponse;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.user.service.UserNotificationPrefService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationDispatcher {

    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserNotificationPrefService prefService;
    private final UserRepository userRepository;

    public NotificationDispatcher(EmailService emailService, SimpMessagingTemplate messagingTemplate,
                                  UserNotificationPrefService prefService, UserRepository userRepository) {
        this.emailService = emailService;
        this.messagingTemplate = messagingTemplate;
        this.prefService = prefService;
        this.userRepository = userRepository;
    }

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

    // ================== EVENT 2: DEADLINE 24H ==================
    public void notifyTaskDeadline(String userId, TaskEntity task) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        UserNotificationPrefResponse pref = prefService.getPreferencesByUserId(userId);

        // 1. In-app Notification
        if (pref.inAppNotificationsEnabled()) {
            String inAppMsg = "🚨 WARNING: Task '" + task.getTitle() + "' is approaching its deadline!";
            messagingTemplate.convertAndSend("/topic/notifications/" + userId, inAppMsg);
        }

        // 2. Email Notification
        if (pref.emailNotificationsEnabled()) {
            String subject = "🚨 [Fluxboard] 24-Hour Deadline Warning!";
            String htmlBody = buildHtmlEmail(
                    "#c53030", "⚠️ Your task deadline is approaching!",
                    task.getTitle(), String.valueOf(task.getPriority()),
                    "This task has less than 24 hours remaining. Please complete it as soon as possible!"
            );
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBody);
        }
    }

    // Template HTML Email (English)
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