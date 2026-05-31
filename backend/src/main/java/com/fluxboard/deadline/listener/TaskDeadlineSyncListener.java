package com.fluxboard.deadline.listener;

import com.fluxboard.board.task.event.TaskCreatedEvent;
import com.fluxboard.board.task.event.TaskDeletedEvent;
import com.fluxboard.board.task.event.TaskUpdatedEvent;
import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
public class TaskDeadlineSyncListener {
    private final TaskDeadlineRepository deadlineRepository;

    @Value("${app.deadline.max-extensions:2}")
    private Integer defaultMaxExtensions;

    @Value("${app.deadline.reminder-offset:1440}")
    private Integer defaultReminderOffset;

    @Async
    @EventListener
    public void onTaskCreated(TaskCreatedEvent event) {
        if (event.getDueDate() == null) return;

        deadlineRepository.findActiveByTaskId(event.getTaskId()).ifPresentOrElse(deadline -> {
            deadline.setStartDate(event.getStartDate());
            deadline.setDueDate(event.getDueDate());
            deadline.setStatus(calculateStatus(deadline));
            deadline.setIsReminderSent(false);
            deadlineRepository.save(deadline);
        }, () -> {
            TaskDeadlineEntity deadline = new TaskDeadlineEntity();
            deadline.setTaskId(event.getTaskId());
            deadline.setStartDate(event.getStartDate());
            deadline.setDueDate(event.getDueDate());
            deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.ON_TRACK);
            deadline.setReminderOffset(defaultReminderOffset);
            deadline.setExtensionLimit(defaultMaxExtensions);
            deadline.setExtensionCount(0);
            deadline.setIsReminderSent(false);
            deadline.setIsExtensionPending(false);
            deadline.setExtensionStatus(TaskDeadlineEntity.ExtensionStatus.NONE);
            deadlineRepository.save(deadline);
        });
    }

    @Async
    @EventListener
    public void onTaskUpdated(TaskUpdatedEvent event) {
        if (event.getDueDate() == null) return;

        deadlineRepository.findActiveByTaskId(event.getTaskId()).ifPresentOrElse(deadline -> {
            boolean dueChanged = deadline.getDueDate() == null || !deadline.getDueDate().equals(event.getDueDate());

            deadline.setStartDate(event.getStartDate());
            deadline.setDueDate(event.getDueDate());
            deadline.setStatus(calculateStatus(deadline));

            if (dueChanged) {
                deadline.setIsReminderSent(false);
            }

            deadlineRepository.save(deadline);
        }, () -> onTaskCreated(new TaskCreatedEvent(
                this,
                event.getTaskId(),
                event.getStartDate(),
                event.getDueDate()
        )));
    }

    @Async
    @EventListener
    public void onTaskDeleted(TaskDeletedEvent event) {
        deadlineRepository.findActiveByTaskId(event.getTaskId()).ifPresent(deadline -> {
            deadline.markDeleted();
            deadlineRepository.save(deadline);
        });
    }

    private TaskDeadlineEntity.DeadlineStatus calculateStatus(TaskDeadlineEntity deadline) {
        if (deadline.getActualCompletedAt() != null) {
            return deadline.getDueDate() != null && deadline.getActualCompletedAt().isAfter(deadline.getDueDate())
                    ? TaskDeadlineEntity.DeadlineStatus.LATE
                    : TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
        }

        if (deadline.getDueDate() == null) return TaskDeadlineEntity.DeadlineStatus.ON_TRACK;

        Instant now = Instant.now();

        if (now.isAfter(deadline.getDueDate())) return TaskDeadlineEntity.DeadlineStatus.OVERDUE;

        return now.isAfter(deadline.getDueDate().minus(Duration.ofHours(24)))
                ? TaskDeadlineEntity.DeadlineStatus.AT_RISK
                : TaskDeadlineEntity.DeadlineStatus.ON_TRACK;
    }
}