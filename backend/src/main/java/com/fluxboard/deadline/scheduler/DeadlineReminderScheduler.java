package com.fluxboard.deadline.scheduler;

import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeadlineReminderScheduler {

    private final TaskDeadlineRepository deadlineRepository;
    private final NotificationDispatcher notificationDispatcher;

    /**
     * Quét mỗi giờ một lần để tìm các Task sắp đến hạn (< 24h)
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void scanAndSendReminders() {
        log.info("CronJob: Scanning the list of upcoming tasks...");
        
        Instant now = Instant.now();
        Instant next24Hours = now.plus(24, ChronoUnit.HOURS);


        List<TaskDeadlineEntity> atRiskTasks = deadlineRepository.findDeadlinesToRemind(now, next24Hours);

        if (atRiskTasks.isEmpty()) {
            return;
        }

        for (TaskDeadlineEntity deadline : atRiskTasks) {
            try {
                deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.AT_RISK);
                deadline.setIsReminderSent(true);
                deadlineRepository.save(deadline);

                notificationDispatcher.dispatchUpcomingAlert(deadline.getTaskId());
                
                log.info("AT_RISK notifications for Tasks have been enabled: {}", deadline.getTaskId());
            } catch (Exception e) {
                log.error("Error sending notifications to Task {}: {}", deadline.getTaskId(), e.getMessage());
            }
        }
    }
}