package com.fluxboard.notification.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.notification.dto.response.NotificationResponse;
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
     * 🔔 API lấy danh sách thông báo đã được bọc DTO + Hỗ trợ Phân trang nâng cao
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
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
        
        // 🚀 Thực hiện ánh xạ (Mapping) từ Entity sang DTO cực kỳ an toàn
        Page<NotificationResponse> responsePage = notifPage.map(this::convertToResponse);
        
        return ResponseFactory.paged("Fetch notifications successfully", responsePage);
    }

    /**
     * 🔴 API lấy số lượng tin nhắn chưa đọc
     */
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@RequestAttribute("userId") String userId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        return ResponseFactory.success("Fetch unread count successfully", count);
    }

    /**
     * ✔️ API đọc từng tin một
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationRepository.findById(id).ifPresent(notif -> {
            notif.setRead(true); 
            notificationRepository.save(notif);
        });
        return ResponseFactory.success("Notification marked as read successfully");
    }

    /**
     * 🧹 API Đọc tất cả
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@RequestAttribute("userId") String userId) {
        List<NotificationEntity> unreadNotifications = notificationRepository.findByRecipientIdAndIsReadFalse(userId);
        for (NotificationEntity notif : unreadNotifications) {
            notif.setRead(true); 
        }
        notificationRepository.saveAll(unreadNotifications);
        return ResponseFactory.success("All notifications marked as read successfully");
    }

    // Hàm phụ trợ hỗ trợ việc ép kiểu dữ liệu sang DTO
    private NotificationResponse convertToResponse(NotificationEntity entity) {
        return NotificationResponse.builder()
                .id(entity.getId())
                .recipientId(entity.getRecipientId())
                .type(entity.getType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .isRead(entity.isRead())
                .metadata(entity.getMetadata())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}