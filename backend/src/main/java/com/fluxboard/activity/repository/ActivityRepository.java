package com.fluxboard.activity.repository;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.enums.ActivitySource;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ActivityRepository extends MongoRepository<ActivityEntity, String> {

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
