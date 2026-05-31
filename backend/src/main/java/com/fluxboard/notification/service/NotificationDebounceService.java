package com.fluxboard.notification.service;

import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
public class NotificationDebounceService {

    private final TaskScheduler taskScheduler;

    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    /**
     * Task vừa tạo sẽ nằm trong set này 10 phút.
     * Trong thời gian đó bỏ qua update/move để không spam notification.
     */
    private final Set<String> pendingCreatedTaskIds = ConcurrentHashMap.newKeySet();

    /**
     * Task vừa complete sẽ nằm trong set này 30 giây.
     * Trong thời gian đó bỏ qua update/move cũ.
     */
    private final Set<String> recentlyCompletedTaskIds = ConcurrentHashMap.newKeySet();

    public NotificationDebounceService(TaskScheduler taskScheduler) {
        this.taskScheduler = taskScheduler;
    }

    public void debounce(String key, Runnable action, long delayMillis) {
        ScheduledFuture<?> existingTask = scheduledTasks.get(key);

        if (existingTask != null && !existingTask.isDone()) {
            existingTask.cancel(false);
        }

        ScheduledFuture<?> newTask = taskScheduler.schedule(() -> {
            try {
                action.run();
            } finally {
                scheduledTasks.remove(key);
            }
        }, Instant.now().plusMillis(delayMillis));

        scheduledTasks.put(key, newTask);
    }

    public void cancel(String key) {
        ScheduledFuture<?> task = scheduledTasks.remove(key);

        if (task != null && !task.isDone()) {
            task.cancel(false);
        }
    }

    public void cancelTaskUpdateAndMove(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            return;
        }

        cancel("TASK_UPDATE_" + taskId);
        cancel("TASK_MOVE_" + taskId);
    }

    public void markTaskRecentlyCreated(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            return;
        }

        pendingCreatedTaskIds.add(taskId);

        taskScheduler.schedule(
                () -> pendingCreatedTaskIds.remove(taskId),
                Instant.now().plus(Duration.ofMinutes(10))
        );
    }

    public boolean isTaskRecentlyCreated(String taskId) {
        return taskId != null && pendingCreatedTaskIds.contains(taskId);
    }

    public boolean markTaskCompletedOnce(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            return false;
        }

        if (!recentlyCompletedTaskIds.add(taskId)) {
            return false;
        }

        cancelTaskUpdateAndMove(taskId);

        taskScheduler.schedule(
                () -> recentlyCompletedTaskIds.remove(taskId),
                Instant.now().plus(Duration.ofSeconds(30))
        );

        return true;
    }

    public boolean isTaskRecentlyCompleted(String taskId) {
        return taskId != null && recentlyCompletedTaskIds.contains(taskId);
    }
}