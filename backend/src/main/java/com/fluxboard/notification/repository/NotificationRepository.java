package com.fluxboard.notification.repository;

import com.fluxboard.notification.entity.NotificationEntity;
import com.fluxboard.notification.entity.NotificationEntity.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends MongoRepository<NotificationEntity, String> {
    Page<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId, Pageable pageable);

    List<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

    Page<NotificationEntity> findByRecipientIdAndIsReadOrderByCreatedAtDesc(String recipientId, boolean isRead, Pageable pageable);

    List<NotificationEntity> findByRecipientIdAndIsReadOrderByCreatedAtDesc(String recipientId, boolean isRead);

    long countByRecipientIdAndIsReadFalse(String recipientId);

    List<NotificationEntity> findByRecipientIdAndIsReadFalse(String recipientId);

    Optional<NotificationEntity> findByIdAndRecipientId(String id, String recipientId);

    Optional<NotificationEntity> findByDedupeKey(String dedupeKey);

    Optional<NotificationEntity> findByRecipientIdAndReferenceIdAndTypeAndStatus(
            String recipientId,
            String referenceId,
            String type,
            NotificationStatus status
    );

    List<NotificationEntity> findByStatusAndSendAtLessThanEqual(NotificationStatus status, Instant sendAt);
}