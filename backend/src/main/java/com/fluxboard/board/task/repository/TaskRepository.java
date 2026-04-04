package com.fluxboard.board.task.repository;

import com.fluxboard.board.task.entity.TaskEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TaskRepository extends MongoRepository<TaskEntity, String> {

    Optional<TaskEntity> findByIdAndDeletedFalse(String id);

    Page<TaskEntity> findByDeletedFalse(Pageable pageable);

    Page<TaskEntity> findByProjectIdAndDeletedFalse(String projectId, Pageable pageable);

    Page<TaskEntity> findByBoardIdAndDeletedFalse(String boardId, Pageable pageable);

    Page<TaskEntity> findByListIdAndDeletedFalse(String listId, Pageable pageable);

    List<TaskEntity> findByBoardIdAndDeletedFalse(String boardId);

    List<TaskEntity> findByListIdAndDeletedFalseOrderByPositionAsc(String listId);

    List<TaskEntity> findByListIdAndDeletedFalseAndPositionGreaterThanEqualOrderByPositionAsc(
            String listId,
            int position
    );

    List<TaskEntity> findByListIdAndDeletedFalseAndPositionGreaterThanOrderByPositionAsc(String listId, int position);

    boolean existsByProjectIdAndTaskCodeAndDeletedFalse(String projectId, String taskCode);

    boolean existsByProjectIdAndTaskCodeAndIdNotAndDeletedFalse(String projectId, String taskCode, String id);
}
