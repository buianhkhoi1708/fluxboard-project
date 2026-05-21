package com.fluxboard.notification.service;

import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Service
public class NotificationDebounceService {

    private final TaskScheduler taskScheduler;
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    private final Map<String, Runnable> creationActions = new ConcurrentHashMap<>();

    public NotificationDebounceService(TaskScheduler taskScheduler) {
        this.taskScheduler = taskScheduler;
    }

    public void debounceCreateTask(String taskId, String recipientId, Runnable action, long delayMillis) {
        String key = "CREATE_TASK_" + taskId + "_" + recipientId;
        creationActions.put(key, action);
        scheduleCreationTask(key, action, delayMillis);
    }

    private void scheduleCreationTask(String key, Runnable action, long delayMillis) {
        ScheduledFuture<?> existingTask = scheduledTasks.get(key);
        if (existingTask != null && !existingTask.isDone()) {
            existingTask.cancel(false);
        }

        ScheduledFuture<?> newTask = taskScheduler.schedule(() -> {
            try {
                action.run();
            } finally {
                scheduledTasks.remove(key);
                creationActions.remove(key);
            }
        }, Instant.now().plusMillis(delayMillis));

        scheduledTasks.put(key, newTask);
    }

    public void debounceUpdateOrMove(String taskId, String recipientId, String notificationType, Runnable action, long delayMillis) {
        String createKey = "CREATE_TASK_" + taskId + "_" + recipientId;

        // 🚀 ĐÚNG LOGIC: Nếu đang trong 10 phút chờ tạo mới, reset đồng hồ tạo mới và NUỐT TRÔI tin nhắn sửa/kéo thả
        if (scheduledTasks.containsKey(createKey) && !scheduledTasks.get(createKey).isDone()) {
            Runnable originalCreateAction = creationActions.get(createKey);
            if (originalCreateAction != null) {
                scheduleCreationTask(createKey, originalCreateAction, 600000); // Đếm lại 10 phút từ đầu
            }
            return; // Hủy hoàn toàn thông báo Update/Move hiện tại
        }

        // Nếu đã qua 10 phút an toàn, thiết lập đếm ngược 1 phút như thường
        String key = notificationType + "_" + taskId + "_" + recipientId;
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
}