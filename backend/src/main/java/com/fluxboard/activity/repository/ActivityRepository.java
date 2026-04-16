package com.fluxboard.activity.repository;

import com.fluxboard.activity.entity.ActivityEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ActivityRepository extends MongoRepository<ActivityEntity, String> {
    
    // 1. Phục vụ API Activity Feed (Dashboard)

    List<ActivityEntity> findAllByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);

    // 2. Phục vụ API Lịch sử đăng nhập 

    @Query(value = "{ 'userId': ?0, 'action': 'LOGIN' }", fields = "{ 'createdAt': 1, 'ipAddress': 1, 'deviceInfo': 1 }")
    Page<ActivityEntity> findLoginHistoriesByUserId(String userId, Pageable pageable);
}