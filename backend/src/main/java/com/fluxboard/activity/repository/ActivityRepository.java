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
    List<ActivityEntity> findAllByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);

    List<ActivityEntity> findTop10ByOrderByCreatedAtDesc();

    @Query(value = "{ 'actor_user_id': ?0, 'action': 'LOGIN', 'is_deleted': false }")
    Page<ActivityEntity> findLoginHistoriesByUserId(String userId, Pageable pageable);

    Optional<ActivityEntity> findByIdAndDeletedFalse(String id);

    Page<ActivityEntity> findByDeletedFalse(Pageable pageable);

    Page<ActivityEntity> findByActivityTypeAndDeletedFalseOrderByCreatedAtDesc(ActivityEntity.ActivityType activityType, Pageable pageable);

    Page<ActivityEntity> findByTaskIdAndDeletedFalse(String taskId, Pageable pageable);

    Page<ActivityEntity> findByProjectIdAndDeletedFalse(String projectId, Pageable pageable);

    Page<ActivityEntity> findBySourceTypeAndSourceIdAndDeletedFalse(ActivitySource sourceType, String sourceId, Pageable pageable);
    // 🚀 Dành cho Bảng tin chung của Manager/Member
    Page<ActivityEntity> findByProjectIdInAndDeletedFalse(List<String> projectIds, Pageable pageable);
}