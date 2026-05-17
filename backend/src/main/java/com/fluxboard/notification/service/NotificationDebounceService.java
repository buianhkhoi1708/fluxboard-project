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
    // Map lưu trữ các Job đang đếm ngược. Key = "LoạiThôngBáo_IDTask_IDNgườiNhận"
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    public NotificationDebounceService(TaskScheduler taskScheduler) {
        this.taskScheduler = taskScheduler;
    }

    /**
     * Hàm giữ chân (Debounce) lệnh thực thi
     * @param key Mã định danh duy nhất của sự kiện
     * @param action Hành động sẽ thực thi (Lưu DB, gửi WebSocket)
     * @param delayMillis Thời gian chờ (mili-giây)
     */
    public void debounce(String key, Runnable action, long delayMillis) {
        // 1. Kiểm tra xem có Job nào trùng Key đang chạy đếm ngược không?
        ScheduledFuture<?> existingTask = scheduledTasks.get(key);
        if (existingTask != null && !existingTask.isDone()) {
            // Có thì HỦY NGAY (Chống Spam)
            existingTask.cancel(false);
        }

        // 2. Lên lịch cho một Job mới tinh, bắt đầu đếm lại
        ScheduledFuture<?> newTask = taskScheduler.schedule(() -> {
            try {
                action.run(); // Chạy lệnh lưu DB và bắn WebSocket
            } finally {
                scheduledTasks.remove(key); // Chạy xong thì tự dọn rác trong Map
            }
        }, Instant.now().plusMillis(delayMillis));

        // 3. Cất vào Map để lần sau còn biết đường tìm mà Hủy
        scheduledTasks.put(key, newTask);
    }
}