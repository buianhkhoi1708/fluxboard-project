package com.fluxboard.activity.repository;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivitySource;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ActivityRepository extends MongoRepository<ActivityEntity, String>, ActivityRepositoryCustom {

public interface ActivityRepository extends MongoRepository<ActivityEntity, String> {
    
    // 1. Phục vụ API Activity Feed (Dashboard)
    List<ActivityEntity> findAllByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);

    // 2. Phục vụ API Lịch sử đăng nhập 
    @Query(value = "{ 'userId': ?0, 'action': 'LOGIN' }", fields = "{ 'createdAt': 1, 'ipAddress': 1, 'deviceInfo': 1 }")
    Page<ActivityEntity> findLoginHistoriesByUserId(String userId, Pageable pageable);

    List<ActivityEntity> findTop10ByOrderByCreatedAtDesc();
}
    Optional<ActivityEntity> findByIdAndDeletedFalse(String id);

    Page<ActivityEntity> findByDeletedFalse(Pageable pageable);

    Page<ActivityEntity> findByTaskIdAndDeletedFalse(String taskId, Pageable pageable);

    Page<ActivityEntity> findByProjectIdAndDeletedFalse(String projectId, Pageable pageable);

    Page<ActivityEntity> findBySourceTypeAndSourceIdAndDeletedFalse(
            ActivitySource sourceType,
            String sourceId,
            Pageable pageable);
}
