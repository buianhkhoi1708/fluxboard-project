package com.fluxboard.user.service;

import com.fluxboard.user.dto.request.UpdateNotificationPrefRequest;
import com.fluxboard.user.dto.response.UserNotificationPrefResponse;
import com.fluxboard.user.entity.UserNotificationPrefEntity;
import com.fluxboard.user.repository.UserNotificationPrefRepository;
import org.springframework.stereotype.Service;

@Service
public class UserNotificationPrefService {

    private final UserNotificationPrefRepository repository;

    public UserNotificationPrefService(UserNotificationPrefRepository repository) {
        this.repository = repository;
    }

    public UserNotificationPrefResponse getPreferencesByUserId(String userId) {
        // Lấy cấu hình từ DB, nếu chưa tồn tại thì tạo mới với giá trị mặc định là true
        UserNotificationPrefEntity entity = repository.findByUserId(userId)
                .orElseGet(() -> {
                    UserNotificationPrefEntity newPref = UserNotificationPrefEntity.builder()
                            .userId(userId)
                            .emailNotificationsEnabled(true)
                            .inAppNotificationsEnabled(true)
                            .build();
                    return repository.save(newPref);
                });

        return new UserNotificationPrefResponse(
                entity.isEmailNotificationsEnabled(),
                entity.isInAppNotificationsEnabled()
        );
    }

    public UserNotificationPrefResponse updatePreferences(String userId, UpdateNotificationPrefRequest request) {
        UserNotificationPrefEntity entity = repository.findByUserId(userId)
                .orElseGet(() -> UserNotificationPrefEntity.builder().userId(userId).build());

        entity.setEmailNotificationsEnabled(request.emailNotificationsEnabled());
        entity.setInAppNotificationsEnabled(request.inAppNotificationsEnabled());
        
        repository.save(entity);

        return new UserNotificationPrefResponse(
                entity.isEmailNotificationsEnabled(),
                entity.isInAppNotificationsEnabled()
        );
    }
}