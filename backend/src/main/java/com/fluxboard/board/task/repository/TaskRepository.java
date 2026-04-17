package com.fluxboard.board.task.repository;

import com.fluxboard.board.task.entity.TaskEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface TaskRepository extends MongoRepository<TaskEntity, String> {

    Optional<TaskEntity> findByIdAndDeletedFalse(String id);

    Page<TaskEntity> findByDeletedFalse(Pageable pageable);

    Page<TaskEntity> findByColumnIdAndDeletedFalse(String columnId, Pageable pageable);

    Page<TaskEntity> findByColumnIdInAndDeletedFalse(List<String> columnIds, Pageable pageable);

    List<TaskEntity> findByColumnIdInAndDeletedFalse(List<String> columnIds);

    List<TaskEntity> findByColumnIdAndDeletedFalseOrderByOrderAsc(String columnId);

    List<TaskEntity> findByColumnIdAndDeletedFalseAndOrderGreaterThanEqualOrderByOrderAsc(
            String columnId,
            int order
    );

    @Query("{ 'project_id': ?0, 'status': ?1, 'ai_suggested_point': { $exists: true, $ne: null } }")
    List<TaskEntity> findByProjectIdAndStatusAndAiSuggestedPointIsNotNull(String projectId, String status);

    List<TaskEntity> findByColumnIdAndDeletedFalseAndOrderGreaterThanOrderByOrderAsc(String columnId, int order);
}
