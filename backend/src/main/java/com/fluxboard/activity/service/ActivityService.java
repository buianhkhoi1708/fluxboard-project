package com.fluxboard.activity.service;

import com.fluxboard.activity.dto.response.ActivityResponse;
import com.fluxboard.activity.dto.response.LoginHistoryResponse;
import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final UserRepository userRepository; 

    public List<LoginHistoryResponse> getLoginHistories(String userId, Pageable pageable) {
        return activityRepository.findLoginHistoriesByUserId(userId, pageable)
                .stream()
                .map(activity -> LoginHistoryResponse.builder()
                        .timestamp(activity.getCreatedAt())
                        .ipAddress(activity.getIpAddress())
                        .deviceInfo(activity.getDeviceInfo())
                        .build()
                )
                .toList();
    }

    public List<ActivityResponse> getRecentActivities(String projectId, Pageable pageable) {
        // Lấy danh sách activity thô từ DB
        List<ActivityEntity> activities = activityRepository.findAllByProjectIdOrderByCreatedAtDesc(projectId, pageable);

        if (activities.isEmpty()) {
            return List.of();
        }

        Set<String> userIds = activities.stream()
                .map(ActivityEntity::getUserId)
                .collect(Collectors.toSet());

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(userIds));
        Map<String, User> userMap = users.stream().collect(Collectors.toMap(User::getId, u -> u));

        // Ráp Tên và Avatar vào Activity
        return activities.stream().map(activity -> {
            User user = userMap.get(activity.getUserId());
            return ActivityResponse.builder()
                    .id(activity.getId())
                    .projectId(activity.getProjectId())
                    .userId(activity.getUserId())
                    .userName(user != null ? user.getFullName() : "Unknown User")
                    .userAvatar(user != null ? user.getAvatarUrl() : null)
                    .action(activity.getAction())
                    .createdAt(activity.getCreatedAt())
                    .build();
        }).toList();
    }
}