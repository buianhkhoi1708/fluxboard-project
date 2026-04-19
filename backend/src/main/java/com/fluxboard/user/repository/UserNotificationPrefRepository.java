package com.fluxboard.user.repository;

import com.fluxboard.user.entity.UserNotificationPrefEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface UserNotificationPrefRepository extends MongoRepository<UserNotificationPrefEntity, String> {
    Optional<UserNotificationPrefEntity> findByUserId(String userId);
}