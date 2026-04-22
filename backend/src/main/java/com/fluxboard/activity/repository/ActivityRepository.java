package com.fluxboard.activity.repository;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivitySource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ActivityRepository extends MongoRepository<ActivityEntity, String>, ActivityRepositoryCustom {

    // ========================================================================
    // 1. DASHBOARD & FEED APIs
    // ========================================================================
    List<ActivityEntity> findAllByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);

    List<ActivityEntity> findTop10ByOrderByCreatedAtDesc();

    // ========================================================================
    // 2. SPECIFIC FEATURE APIs
    // ========================================================================
    @Query(value = "{ 'userId': ?0, 'action': 'LOGIN' }", fields = "{ 'createdAt': 1, 'ipAddress': 1, 'deviceInfo': 1 }")
    Page<ActivityEntity> findLoginHistoriesByUserId(String userId, Pageable pageable);

    // ========================================================================
    // 3. STANDARD QUERIES (SOFT DELETE APPLIED)
    // ========================================================================
    Optional<ActivityEntity> findByIdAndDeletedFalse(String id);

    Page<ActivityEntity> findByDeletedFalse(Pageable pageable);

    Page<ActivityEntity> findByTaskIdAndDeletedFalse(String taskId, Pageable pageable);

    Page<ActivityEntity> findByProjectIdAndDeletedFalse(String projectId, Pageable pageable);

    Page<ActivityEntity> findBySourceTypeAndSourceIdAndDeletedFalse(
            ActivitySource sourceType, 
            String sourceId, 
            Pageable pageable
    );
}