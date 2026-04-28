package com.fluxboard.deadline.repository;

import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskDeadlineRepository extends MongoRepository<TaskDeadlineEntity, String> {
    Optional<TaskDeadlineEntity> findByTaskId(String taskId);
    
    @Query("{ 'status': 'ON_TRACK', 'due_date': { $lt: ?0 } }")
    List<TaskDeadlineEntity> findOverdueTasks(Instant currentTime);

    @Query("{ 'status': 'ON_TRACK', 'due_date': { $lte: ?0, $gt: ?1 } }")
    List<TaskDeadlineEntity> findTasksForReminder(Instant upperLimit, Instant lowerLimit);

    @Query("{ 'actual_completed_at': null, 'is_reminder_sent': false, 'due_date': { $gt: ?0, $lte: ?1 } }")
    List<TaskDeadlineEntity> findDeadlinesToRemind(Instant now, Instant next24Hours);
}