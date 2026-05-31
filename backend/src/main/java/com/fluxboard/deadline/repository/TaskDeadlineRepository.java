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

    @Query("{ 'task_id': ?0, 'is_deleted': { $ne: true } }")
    Optional<TaskDeadlineEntity> findActiveByTaskId(String taskId);

    @Query("{ 'actual_completed_at': null, 'due_date': { $lt: ?0 }, 'status': { $ne: 'OVERDUE' }, 'is_deleted': { $ne: true } }")
    List<TaskDeadlineEntity> findOverdueTasks(Instant currentTime);

    @Query("{ 'actual_completed_at': null, 'is_reminder_sent': { $ne: true }, 'due_date': { $lte: ?0, $gt: ?1 }, 'is_deleted': { $ne: true } }")
    List<TaskDeadlineEntity> findTasksForReminder(Instant upperLimit, Instant lowerLimit);

    @Query("{ 'actual_completed_at': null, 'is_reminder_sent': { $ne: true }, 'due_date': { $gt: ?0, $lte: ?1 }, 'is_deleted': { $ne: true } }")
    List<TaskDeadlineEntity> findDeadlinesToRemind(Instant now, Instant next24Hours);

    @Query("{ 'is_extension_pending': true, 'is_deleted': { $ne: true } }")
    List<TaskDeadlineEntity> findPendingExtensionRequests();

    @Query("{ 'is_extension_pending': true, 'extension_status': 'PENDING', 'extension_requested_at': { $lte: ?0 }, 'is_deleted': { $ne: true } }")
    List<TaskDeadlineEntity> findPendingExtensionRequestsOlderThan(Instant expiredBefore);
}