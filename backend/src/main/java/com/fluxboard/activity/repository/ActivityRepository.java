package com.fluxboard.activity.repository;

import com.fluxboard.activity.entity.ActivityEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ActivityRepository extends MongoRepository<ActivityEntity, String> {
    // Requires an index on createdAt field in MongoDB for performance < 50ms
    List<ActivityEntity> findAllByProjectIdOrderByCreatedAtDesc(String projectId, Pageable pageable);
}