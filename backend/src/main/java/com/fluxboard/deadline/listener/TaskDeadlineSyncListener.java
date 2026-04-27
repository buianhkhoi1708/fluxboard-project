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
        TaskDeadlineEntity deadline = new TaskDeadlineEntity();
        deadline.setTaskId(event.getTaskId());
        deadline.setStartDate(event.getStartDate());
        deadline.setDueDate(event.getDueDate());
        deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.ON_TRACK);
        deadline.setReminderOffset(defaultReminderOffset);
        deadline.setExtensionLimit(defaultMaxExtensions);
        deadlineRepository.save(deadline);
    }

    @Async
    @EventListener
    public void onTaskUpdated(TaskUpdatedEvent event) {
        deadlineRepository.findByTaskId(event.getTaskId()).ifPresentOrElse(deadline -> {
            deadline.setStartDate(event.getStartDate());
            deadline.setDueDate(event.getDueDate());
            if (deadline.getDueDate() != null && deadline.getDueDate().isAfter(Instant.now())) {
                deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.ON_TRACK);
            }
            deadlineRepository.save(deadline);
        }, () -> {
            if (event.getDueDate() != null) {
                onTaskCreated(new TaskCreatedEvent(this, event.getTaskId(), event.getStartDate(), event.getDueDate()));
            }
        });
    }

    @Async
    @EventListener
    public void onTaskDeleted(TaskDeletedEvent event) {
        deadlineRepository.findByTaskId(event.getTaskId()).ifPresent(deadlineRepository::delete);
    }
}