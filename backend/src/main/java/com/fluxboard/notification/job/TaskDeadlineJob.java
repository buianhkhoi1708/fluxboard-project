package com.fluxboard.notification.job;

import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class TaskDeadlineJob {

    private final TaskDeadlineRepository deadlineRepository;
    private final NotificationDispatcher notificationDispatcher;

    @Value("${app.deadline.reminder-offset:1440}")
    private Integer reminderOffset;

    @Scheduled(cron = "0 * * * * *")
    public void scanAndNotifyApproachingDeadlines() {
        Instant now = Instant.now();

        List<TaskDeadlineEntity> overdueRecords = deadlineRepository.findOverdueTasks(now);
        for (TaskDeadlineEntity record : overdueRecords) {
            record.setStatus(TaskDeadlineEntity.DeadlineStatus.OVERDUE);
            notificationDispatcher.notifyTaskDeadline(record.getTaskId()); 
        }
        if (!overdueRecords.isEmpty()) {
            deadlineRepository.saveAll(overdueRecords);
        }

        Instant reminderTarget = now.plus(Duration.ofMinutes(reminderOffset));
        List<TaskDeadlineEntity> upcomingTasks = deadlineRepository.findTasksForReminder(reminderTarget, now);
        for (TaskDeadlineEntity record : upcomingTasks) {
            notificationDispatcher.notifyTaskDeadline(record.getTaskId());
        }
    }
}