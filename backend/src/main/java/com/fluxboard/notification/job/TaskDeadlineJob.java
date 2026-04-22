package com.fluxboard.notification.job;

import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.notification.service.NotificationDispatcher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class TaskDeadlineJob {

    private final TaskRepository taskRepository;
    private final NotificationDispatcher notificationDispatcher;

    public TaskDeadlineJob(TaskRepository taskRepository, NotificationDispatcher notificationDispatcher) {
        this.taskRepository = taskRepository;
        this.notificationDispatcher = notificationDispatcher;
    }

    @Scheduled(cron = "0 0 * * * *") 
    public void scanAndNotifyApproachingDeadlines() {
        Instant now = Instant.now();
        Instant in23Hours = now.plus(23, ChronoUnit.HOURS);
        Instant in24Hours = now.plus(24, ChronoUnit.HOURS);

        List<TaskEntity> urgentTasks = taskRepository.findTasksApproachingDeadline(in23Hours, in24Hours);

        for (TaskEntity task : urgentTasks) {
            if (task.getAssigneesUserId() != null) {
                for (String assigneeId : task.getAssigneesUserId()) {
                    notificationDispatcher.notifyTaskDeadline(assigneeId, task);
                }
            }
        }
    }
}