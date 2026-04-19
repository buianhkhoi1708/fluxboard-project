package com.fluxboard.activity.service;

import com.fluxboard.activity.dto.response.LoginHistoryResponse;
import com.fluxboard.activity.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;

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
}