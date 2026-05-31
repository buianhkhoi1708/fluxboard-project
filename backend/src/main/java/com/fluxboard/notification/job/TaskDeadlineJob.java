package com.fluxboard.notification.job;

import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.deadline.service.TaskDeadlineService;
import com.fluxboard.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TaskDeadlineJob {
    private final TaskDeadlineRepository deadlineRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final TaskDeadlineService deadlineService;

    @Value("${app.deadline.reminder-offset:1440}")
    private Integer reminderOffset;

    @Scheduled(cron = "0 * * * * *")
    public void scanAndNotifyApproachingDeadlines() {
        Instant now = Instant.now();
        List<TaskDeadlineEntity> changed = new ArrayList<>();

        List<TaskDeadlineEntity> overdueRecords = deadlineRepository.findOverdueTasks(now);
        for (TaskDeadlineEntity record : overdueRecords) {
            record.setStatus(TaskDeadlineEntity.DeadlineStatus.OVERDUE);
            notificationDispatcher.dispatchOverdueAlert(record.getTaskId());
            changed.add(record);
        }

        int offsetMinutes = reminderOffset == null ? 1440 : reminderOffset;
        Instant reminderTarget = now.plus(Duration.ofMinutes(offsetMinutes));

        List<TaskDeadlineEntity> upcomingTasks = deadlineRepository.findTasksForReminder(reminderTarget, now);
        for (TaskDeadlineEntity record : upcomingTasks) {
            record.setStatus(TaskDeadlineEntity.DeadlineStatus.AT_RISK);
            record.setIsReminderSent(true);
            notificationDispatcher.dispatchUpcomingAlert(record.getTaskId());
            changed.add(record);
        }

        if (!changed.isEmpty()) {
            deadlineRepository.saveAll(changed);
        }
    }

    @Scheduled(cron = "0 */5 * * * *")
    public void autoRejectExpiredExtensionRequests() {
        Instant expiredBefore = Instant.now().minus(Duration.ofDays(3));
        List<TaskDeadlineEntity> expiredRequests = deadlineRepository.findPendingExtensionRequestsOlderThan(expiredBefore);

        for (TaskDeadlineEntity deadline : expiredRequests) {
            try {
                deadlineService.autoRejectExpiredExtension(deadline.getTaskId());
            } catch (Exception e) {
                log.warn("Cannot auto reject extension request for task {}: {}", deadline.getTaskId(), e.getMessage());
            }
        }
    }
}