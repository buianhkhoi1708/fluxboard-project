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
    // Map luân chuyển các luồng hẹn giờ chạy ngầm. Key dạng: "LoạiSựKiện_IDTask_IDNgườiNhận"
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    public NotificationDebounceService(TaskScheduler taskScheduler) {
        this.taskScheduler = taskScheduler;
    }

    /**
     * Hàm giữ chân tác vụ (Debounce) chống spam dồn dập dữ liệu.
     * @param key Mã định danh duy nhất của chuỗi thao tác liên tục
     * @param action Logic xử lý thực tế (Lưu Database và bắn qua ống WebSocket)
     * @param delayMillis Thời gian chờ kích hoạt (mili-giây)
     */
    public void debounce(String key, Runnable action, long delayMillis) {
        // 1. Nếu tìm thấy một lệnh hẹn giờ trùng Key đang chạy đếm ngược, HỦY NGAY LẬP TỨC
        ScheduledFuture<?> existingTask = scheduledTasks.get(key);
        if (existingTask != null && !existingTask.isDone()) {
            existingTask.cancel(false);
        }

        // 2. Thiết lập một lệnh đếm ngược mới tinh từ thời điểm hiện tại
        ScheduledFuture<?> newTask = taskScheduler.schedule(() -> {
            try {
                action.run(); // Chỉ chạy khi thời gian delay kết thúc hoàn toàn và không bị ngắt quãng
            } finally {
                scheduledTasks.remove(key); // Dọn rác trong Map bộ nhớ đệm sau khi hoàn thành
            }
        }, Instant.now().plusMillis(delayMillis));

        scheduledTasks.put(key, newTask);
    }
}