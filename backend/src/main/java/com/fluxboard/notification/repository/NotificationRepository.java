package com.fluxboard.notification.repository;

import com.fluxboard.notification.entity.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<NotificationEntity, String> {
    
    // 1. Tìm thông báo có lọc trạng thái Đọc/Chưa đọc + Phân trang sắp xếp mới nhất
    Page<NotificationEntity> findByRecipientIdAndIsReadOrderByCreatedAtDesc(String recipientId, boolean isRead, Pageable pageable);
    
    // 2. Tìm toàn bộ lịch sử thông báo của user + Phân trang sắp xếp mới nhất
    Page<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);
    
    // 3. Đếm số lượng thông báo chưa đọc (Phục vụ số nảy icon chuông 🔔)
    long countByRecipientIdAndIsReadFalse(String recipientId);
    
    // 4. Tìm danh sách tin chưa đọc (Phục vụ tính năng Đọc tất cả)
    List<NotificationEntity> findByRecipientIdAndIsReadFalse(String recipientId);
}