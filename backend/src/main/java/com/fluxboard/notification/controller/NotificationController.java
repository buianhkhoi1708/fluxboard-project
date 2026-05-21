package com.fluxboard.notification.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    /**
     * 🔔 API lấy danh sách thông báo (Có phân trang + Bộ lọc thông minh)
     * URL: GET /api/v1/notifications?unreadOnly=true&page=0&size=10
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationEntity>>> getNotifications(
            @RequestAttribute("userId") String userId,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationEntity> notifPage;
        
        if (Boolean.TRUE.equals(unreadOnly)) {
            notifPage = notificationRepository.findByRecipientIdAndIsReadOrderByCreatedAtDesc(userId, false, pageable);
        } else {
            notifPage = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        }
        
        // 🚀 ĐÃ SỬA: Dùng hàm paged kèm theo chuỗi message đúng thiết kế ResponseFactory của bạn
        return ResponseFactory.paged("Fetch notifications successfully", notifPage);
    }

    /**
     * 🔴 API đếm số lượng thông báo chưa đọc để hiển thị số nảy (Badge) trên UI
     * URL: GET /api/v1/notifications/unread-count
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@RequestAttribute("userId") String userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        
        // 🚀 ĐÃ SỬA: Thêm chuỗi message vào tham số đầu tiên
        return ResponseFactory.success("Fetch unread count successfully", count);
    }

    /**
     * ✔️ API đánh dấu một thông báo cụ thể là đã đọc khi người dùng click vào chi tiết
     * URL: PATCH /api/v1/notifications/{id}/read
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationRepository.findById(id).ifPresent(notif -> {
            notif.setRead(true); 
            notificationRepository.save(notif);
        });
        
        // 🚀 ĐÃ SỬA: Thêm chuỗi message thông báo hành động thành công
        return ResponseFactory.success("Notification marked as read successfully");
    }

    /**
     * 🧹 API "Đọc tất cả" - Đánh dấu toàn bộ thông báo chưa đọc của user thành đã đọc
     * URL: PATCH /api/v1/notifications/read-all
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@RequestAttribute("userId") String userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository.findByRecipientIdAndIsReadFalse(userId);
        
        for (NotificationEntity notif : unreadNotifications) {
            notif.setRead(true); 
        }
        
        notificationRepository.saveAll(unreadNotifications);
        
        // 🚀 ĐÃ SỬA: Thêm chuỗi message thông báo hành động thành công
        return ResponseFactory.success("All notifications marked as read successfully");
    }
}