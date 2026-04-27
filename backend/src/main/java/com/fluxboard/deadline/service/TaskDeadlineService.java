package com.fluxboard.deadline.service;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.deadline.entity.TaskDeadlineEntity;
import com.fluxboard.deadline.event.DeadlineExtendedEvent;
import com.fluxboard.deadline.repository.TaskDeadlineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TaskDeadlineService {
    
    private final TaskDeadlineRepository deadlineRepository;
    private final TaskRepository taskRepository;
    private final BoardColumnRepository columnRepository;
    private final ApplicationEventPublisher eventPublisher;

    private void validateTaskAccess(TaskEntity task, String userId) {
        boolean isAssignee = task.getAssigneesUserId() != null && task.getAssigneesUserId().contains(userId);
        if (!isAssignee) {
            throw new AppException(ErrorCode.FORBIDDEN, "User is not assigned to this task.");
        }
    }

    @Transactional
    public Map<String, Object> completeTaskKPI(String taskId, String userId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found"));
        
        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing"));

        Instant now = Instant.now();
        deadline.setActualCompletedAt(now);
        
        boolean isLate = deadline.getDueDate() != null && now.isAfter(deadline.getDueDate());
        deadline.setStatus(isLate ? TaskDeadlineEntity.DeadlineStatus.LATE : TaskDeadlineEntity.DeadlineStatus.COMPLETED);
        deadlineRepository.save(deadline);

        return Map.of(
            "taskId", taskId,
            "dueDate", deadline.getDueDate(),
            "actualCompletedAt", now,
            "isLate", isLate,
            "lateDuration", isLate ? Duration.between(deadline.getDueDate(), now).toHours() + " hours" : "0 hours"
        );
    }

    @Transactional
    public void extendDeadline(String taskId, String userId, Instant newDueDate, String reason) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found"));
        
        validateTaskAccess(task, userId);

        TaskDeadlineEntity deadline = deadlineRepository.findByTaskId(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Deadline record missing"));

        if (deadline.getExtensionLimit() != null && deadline.getExtensionCount() >= deadline.getExtensionLimit()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Deadline extension limit reached");
        }

        Instant oldDueDate = deadline.getDueDate();
        deadline.setDueDate(newDueDate);
        deadline.setExtensionCount(deadline.getExtensionCount() + 1);
        deadline.setStatus(TaskDeadlineEntity.DeadlineStatus.ON_TRACK);
        deadlineRepository.save(deadline);

        task.setDueDate(newDueDate);
        taskRepository.save(task);

        // Lấy boardId thông qua Column (Tránh lỗi Cannot resolve method)
        String boardId = null;
        if (task.getColumnId() != null) {
            Optional<BoardColumnEntity> columnOpt = columnRepository.findById(task.getColumnId());
            if (columnOpt.isPresent()) {
                boardId = columnOpt.get().getBoardId();
            }
        }

        // Tuyệt đối không dùng task.getBoardId() ở đây
        eventPublisher.publishEvent(new DeadlineExtendedEvent(
                this, 
                taskId, 
                task.getProjectId(), 
                boardId, 
                userId, 
                oldDueDate, 
                newDueDate, 
                reason
        ));
    }
}