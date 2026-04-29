package com.fluxboard.board.task.service;

import com.fluxboard.activity.service.ActivityService;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.entity.BoardEntity;
import com.fluxboard.board.repository.BoardRepository;
import com.fluxboard.board.task.dto.request.CreateTaskRequest;
import com.fluxboard.board.task.dto.request.TaskMoveRequest;
import com.fluxboard.board.task.dto.request.UpdateTaskRequest;
import com.fluxboard.board.task.dto.response.TaskResponse;
import com.fluxboard.board.task.dto.response.TaskUserSummaryResponse;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.common.service.CrudService;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.notification.service.NotificationDispatcher;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import com.fluxboard.activity.enums.ActivityAction;
import com.fluxboard.activity.enums.ActivitySource;
import com.fluxboard.activity.event.ActivityCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fluxboard.board.task.event.TaskCreatedEvent;
import com.fluxboard.board.task.event.TaskUpdatedEvent;
import com.fluxboard.board.task.event.TaskDeletedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService implements CrudService<TaskResponse, String, CreateTaskRequest, UpdateTaskRequest> {

    
private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationDispatcher notificationDispatcher;
    private final ActivityService activityService;
    private final ApplicationEventPublisher eventPublisher;

    // ========================================================================
    // 1. PUBLIC CRUD & BUSINESS METHODS
    // ========================================================================

    @Override
    public TaskResponse create(CreateTaskRequest request) {
        return create(request, null);
    }

    @Transactional 
    public TaskResponse create(CreateTaskRequest request, String authorUserId) {
        String columnId = TextUtils.trim(request.columnId());
        BoardColumnEntity column = findBoardColumnById(columnId);
        String boardId = column.getBoardId();
        String projectId = findBoardById(boardId).getProjectId();

        String normalizedAuthorUserId = requireAuthenticatedUserId(authorUserId);
        validateUserExists(normalizedAuthorUserId, "Author user does not exist.");

        List<String> assigneesUserId = normalizeIdList(request.assigneesUserId());
        validateUsersExist(assigneesUserId, "Assignee user does not exist: ");

        String parentTaskId = validateAndNormalizeParentTask(request.parentTaskId(), columnId, boardId, null);
        validateDateRange(request.startDate(), request.dueDate());

        int targetOrder = nextOrder(columnId, parentTaskId);

        TaskEntity entity = new TaskEntity();
        entity.setTitle(TextUtils.trim(request.title()));
        entity.setDescription(TextUtils.trimToNull(request.description()));
        entity.setColumnId(columnId);
        entity.setParentTaskId(parentTaskId);
        entity.setAssigneesUserId(assigneesUserId);
        entity.setPriority(request.priority());

        entity.setStartDate(request.startDate());
        entity.setDueDate(request.dueDate());
        entity.setStatus(TextUtils.trim(request.status()));
        entity.setStoryPoint(request.storyPoint());
        entity.setEstimatedDate(request.estimatedDate());
        entity.setOrder(targetOrder);
        entity.setAiSuggestedPoint(request.aiSuggestedPoint());
        entity.setAiEstimatedReason(TextUtils.trimToNull(request.aiEstimatedReason()));
        entity.setAuthorUserId(normalizedAuthorUserId);

        TaskEntity saved = taskRepository.save(entity);

        eventPublisher.publishEvent(new TaskCreatedEvent(this, saved.getId(), saved.getStartDate(), saved.getDueDate()));

        if (saved.getAssigneesUserId() != null && !saved.getAssigneesUserId().isEmpty()) {
            saved.getAssigneesUserId().forEach(assigneeId -> notificationDispatcher.notifyTaskAssigned(assigneeId, saved));
        }

        broadcastBoardChange(boardId, "TASK_CREATED", saved.getId());
        
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.TASK, saved.getId(), projectId, boardId, saved.getId(),
                normalizedAuthorUserId, ActivityAction.CREATE, null, null, null,
                "Task created: " + saved.getTitle()
        ));

        return toResponse(saved, resolveUserSummaries(List.of(saved)));
    }

    @Override
    public TaskResponse getById(String id) {
        TaskEntity entity = findTaskById(id);
        return toResponse(entity, resolveUserSummaries(List.of(entity)));
    }

    @Override
    public Page<TaskResponse> getPage(Pageable pageable) {
        return toResponsePage(taskRepository.findByDeletedFalse(pageable));
    }

    public Page<TaskResponse> getPageByProject(String projectId, Pageable pageable) {
        String normalizedProjectId = TextUtils.trim(projectId);
        findProjectById(normalizedProjectId);

        List<String> boardIds = boardRepository.findByProjectIdAndDeletedFalse(normalizedProjectId)
                .stream().map(BoardEntity::getId).toList();

        if (boardIds.isEmpty()) return Page.empty(pageable);

        List<String> columnIds = boardColumnRepository.findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds)
                .stream().map(BoardColumnEntity::getId).toList();

        if (columnIds.isEmpty()) return Page.empty(pageable);

        return toResponsePage(taskRepository.findByColumnIdInAndDeletedFalse(columnIds, pageable));
    }

    public Page<TaskResponse> getPageByBoard(String boardId, Pageable pageable) {
        String normalizedBoardId = TextUtils.trim(boardId);
        findBoardById(normalizedBoardId);
        List<String> columnIds = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(normalizedBoardId)
                .stream().map(BoardColumnEntity::getId).toList();

        if (columnIds.isEmpty()) return Page.empty(pageable);

        return toResponsePage(taskRepository.findByColumnIdInAndDeletedFalse(columnIds, pageable));
    }

    public Page<TaskResponse> getPageByColumn(String columnId, Pageable pageable) {
        String normalizedColumnId = TextUtils.trim(columnId);
        findBoardColumnById(normalizedColumnId);
        return toResponsePage(taskRepository.findByColumnIdAndDeletedFalse(normalizedColumnId, pageable));
    }

    public List<TaskResponse> getByColumnIdOrdered(String columnId) {
        String normalizedColumnId = TextUtils.trim(columnId);
        findBoardColumnById(normalizedColumnId);

        List<TaskEntity> entities = taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(normalizedColumnId);
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(entities);

        return entities.stream().map(entity -> toResponse(entity, users)).toList();
    }

    @Override
    public TaskResponse update(String id, UpdateTaskRequest request) {
        return update(id, request, null);
    }

    @Transactional 
    public TaskResponse update(String id, UpdateTaskRequest request, String actorUserId) {
        TaskEntity entity = findTaskById(id);
        String previousTitle = entity.getTitle();
        String previousStatus = entity.getStatus();
        String previousColumnId = entity.getColumnId();
        int previousOrder = entity.getOrder();
        String previousDueDate = asString(entity.getDueDate());

        String columnId = TextUtils.trim(request.columnId());
        BoardColumnEntity column = findBoardColumnById(columnId);
        String boardId = column.getBoardId();
        String projectId = findBoardById(boardId).getProjectId();

        List<String> assigneesUserId = normalizeIdList(request.assigneesUserId());
        validateUsersExist(assigneesUserId, "Assignee user does not exist: ");

        String parentTaskId = validateAndNormalizeParentTask(request.parentTaskId(), columnId, boardId, id);
        validateDateRange(request.startDate(), request.dueDate());

        String currentColumnId = entity.getColumnId();
        String currentParentTaskId = TextUtils.trimToNull(entity.getParentTaskId());
        int currentOrder = entity.getOrder();
        boolean sameGroup = currentColumnId.equals(columnId) && sameParentTask(currentParentTaskId, parentTaskId);
        int targetOrder = resolveUpdateOrder(columnId, parentTaskId, request.order(), sameGroup ? currentOrder : null);

        if (sameGroup) {
            if (targetOrder != currentOrder) {
                moveInsideColumnGroup(columnId, parentTaskId, currentOrder, targetOrder, entity.getId());
            }
        } else {
            shiftOrdersForInsert(columnId, parentTaskId, targetOrder, null);
            shiftOrdersAfterDelete(currentColumnId, currentParentTaskId, currentOrder, entity.getId());
        }

        List<String> oldAssignees = entity.getAssigneesUserId() == null ? new ArrayList<>() : new ArrayList<>(entity.getAssigneesUserId());

        entity.setTitle(TextUtils.trim(request.title()));
        entity.setDescription(TextUtils.trimToNull(request.description()));
        entity.setColumnId(columnId);
        entity.setParentTaskId(parentTaskId);
        entity.setAssigneesUserId(assigneesUserId);
        entity.setPriority(request.priority());
        entity.setStartDate(request.startDate());
        entity.setDueDate(request.dueDate());
        entity.setStatus(TextUtils.trim(request.status()));
        entity.setStoryPoint(request.storyPoint());
        entity.setEstimatedDate(request.estimatedDate());
        entity.setOrder(targetOrder);
        entity.setAiSuggestedPoint(request.aiSuggestedPoint());
        entity.setAiEstimatedReason(TextUtils.trimToNull(request.aiEstimatedReason()));

        TaskEntity saved = taskRepository.save(entity);

        eventPublisher.publishEvent(new TaskUpdatedEvent(this, saved.getId(), saved.getStartDate(), saved.getDueDate()));

        if (saved.getAssigneesUserId() != null) {
            saved.getAssigneesUserId().stream()
                    .filter(assigneeId -> !oldAssignees.contains(assigneeId))
                    .forEach(assigneeId -> notificationDispatcher.notifyTaskAssigned(assigneeId, saved));
        }

        broadcastBoardChange(boardId, "TASK_UPDATED", saved.getId());
        String normalizedActorUserId = TextUtils.trimToNull(actorUserId);

        if (!sameText(previousColumnId, saved.getColumnId())) {
            eventPublisher.publishEvent(new ActivityCreatedEvent(
                    this, ActivitySource.TASK, saved.getId(), projectId, boardId, saved.getId(),
                    normalizedActorUserId, ActivityAction.MOVE, "columnId", previousColumnId, saved.getColumnId(),
                    "Task moved: " + saved.getTitle()
            ));
        } else {
            String changedField = null;
            String oldValue = null;
            String newValue = null;

            if (!sameText(previousTitle, saved.getTitle())) {
                changedField = "title"; oldValue = previousTitle; newValue = saved.getTitle();
            } else if (!sameText(previousStatus, saved.getStatus())) {
                changedField = "status"; oldValue = previousStatus; newValue = saved.getStatus();
            } else if (previousOrder != saved.getOrder()) {
                changedField = "order"; oldValue = asString(previousOrder); newValue = asString(saved.getOrder());
            } else if (!sameText(previousDueDate, asString(saved.getDueDate()))) {
                changedField = "dueDate"; oldValue = previousDueDate; newValue = asString(saved.getDueDate());
            }

            if (changedField != null) {
                eventPublisher.publishEvent(new ActivityCreatedEvent(
                        this, ActivitySource.TASK, saved.getId(), projectId, boardId, saved.getId(),
                        normalizedActorUserId, ActivityAction.UPDATE, changedField, oldValue, newValue,
                        "Task updated: " + saved.getTitle()
                ));
            }
        }

        return toResponse(saved, resolveUserSummaries(List.of(saved)));
    }

    @Transactional
    public TaskResponse moveTask(String id, TaskMoveRequest request) {
        return moveTask(id, request, null);
    }

    @Transactional
    public TaskResponse moveTask(String id, TaskMoveRequest request, String actorUserId) {
        try {
            TaskEntity entity = findTaskById(id);
            String currentColumnId = entity.getColumnId();
            String newColumnId = TextUtils.trim(request.newColumnId());
            
            BoardColumnEntity newColumn = findBoardColumnById(newColumnId);
            BoardColumnEntity currentColumn = findBoardColumnById(currentColumnId);
            
            if (!currentColumn.getBoardId().equals(newColumn.getBoardId())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Validation Error: Cannot move task to a different board.");
            }

            String boardId = newColumn.getBoardId();
            String projectId = findBoardById(boardId).getProjectId();
            String parentTaskId = TextUtils.trimToNull(entity.getParentTaskId());
            int currentOrder = entity.getOrder();
            boolean sameGroup = currentColumnId.equals(newColumnId);
            
            int targetOrder = resolveUpdateOrder(newColumnId, parentTaskId, request.newOrder(), sameGroup ? currentOrder : null);

            if (sameGroup) {
                if (targetOrder != currentOrder) {
                    moveInsideColumnGroup(newColumnId, parentTaskId, currentOrder, targetOrder, entity.getId());
                }
            } else {
                shiftOrdersForInsert(newColumnId, parentTaskId, targetOrder, null);
                shiftOrdersAfterDelete(currentColumnId, parentTaskId, currentOrder, entity.getId());
            }

            entity.setColumnId(newColumnId);
            entity.setOrder(targetOrder);

            if (newColumn.getName() != null) {
                String colName = newColumn.getName().toUpperCase();
                if (colName.contains("DONE") || colName.contains("HOÀN THÀNH")) {
                    entity.setStatus("DONE");
                } else if (colName.contains("PROGRESS") || colName.contains("ĐANG LÀM") || colName.contains("DOING")) {
                    entity.setStatus("IN_PROGRESS");
                } else {
                    entity.setStatus("TODO");
                }
            }

            TaskEntity saved = taskRepository.save(entity);
            
            broadcastBoardChange(boardId, "TASK_MOVED", saved.getId());
            
            eventPublisher.publishEvent(new ActivityCreatedEvent(
                    this, ActivitySource.TASK, saved.getId(), projectId, boardId, saved.getId(),
                    TextUtils.trimToNull(actorUserId), ActivityAction.MOVE, "columnId", currentColumnId, newColumnId,
                    "Task moved: " + saved.getTitle()
            ));

            return toResponse(saved, resolveUserSummaries(List.of(saved)));
            
        } catch (DuplicateKeyException e) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Conflict: Another move operation is in progress. Please try again.");
        }
    }

    @Override
    public void delete(String id) {
        delete(id, null);
    }

    @Transactional 
    public void delete(String id, String actorUserId) {
        TaskEntity entity = findTaskById(id);
        String columnId = entity.getColumnId();
        
        BoardColumnEntity columnForBoardId = findBoardColumnById(columnId);
        String boardId = columnForBoardId.getBoardId();
        String projectId = findBoardById(boardId).getProjectId();

        List<TaskEntity> columnTasks = taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(columnId);
        Map<String, List<TaskEntity>> childrenByParentId = buildChildrenByParentId(columnTasks);
        Set<String> deletedTaskIds = collectSubtreeTaskIds(entity.getId(), childrenByParentId);

        if (deletedTaskIds.isEmpty()) return;

        List<TaskEntity> toDelete = new ArrayList<>();
        Set<String> affectedGroupKeys = new LinkedHashSet<>();

        for (TaskEntity task : columnTasks) {
            if (deletedTaskIds.contains(task.getId())) {
                affectedGroupKeys.add(toGroupKey(task.getParentTaskId()));
                task.markDeleted();
                toDelete.add(task);
            }
        }
        taskRepository.saveAll(toDelete);

        for (String deletedTaskId : deletedTaskIds) {
             eventPublisher.publishEvent(new TaskDeletedEvent(this, deletedTaskId));
        }

        List<TaskEntity> toResequence = resequenceAfterDelete(columnTasks, deletedTaskIds, affectedGroupKeys);
        if (!toResequence.isEmpty()) {
            taskRepository.saveAll(toResequence);
        }
        
        broadcastBoardChange(boardId, "TASK_DELETED", entity.getId());
        
        eventPublisher.publishEvent(new ActivityCreatedEvent(
                this, ActivitySource.TASK, entity.getId(), projectId, boardId, entity.getId(),
                TextUtils.trimToNull(actorUserId), ActivityAction.DELETE, null, null, null,
                "Task deleted: " + entity.getTitle()
        ));
    }

    @Transactional 
    public void softDeleteByBoardId(String boardId) {
        List<String> columnIds = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(boardId))
                .stream().map(BoardColumnEntity::getId).toList();
        
        if (columnIds.isEmpty()) return;

        List<TaskEntity> tasks = taskRepository.findByColumnIdInAndDeletedFalse(columnIds);
        if (!tasks.isEmpty()) {
            tasks.forEach(TaskEntity::markDeleted);
            taskRepository.saveAll(tasks);
            for (TaskEntity task : tasks) {
                eventPublisher.publishEvent(new TaskDeletedEvent(this, task.getId()));
            }
            broadcastBoardChange(boardId, "COLUMN_TASKS_DELETED", "");
        }
    }

    @Transactional 
    public void softDeleteByColumnId(String columnId) {
        BoardColumnEntity columnForBoardId = findBoardColumnById(columnId);
        String boardId = columnForBoardId.getBoardId();
        
        List<TaskEntity> tasks = taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(columnId));
        if (!tasks.isEmpty()) {
            tasks.forEach(TaskEntity::markDeleted);
            taskRepository.saveAll(tasks);
            for (TaskEntity task : tasks) {
                eventPublisher.publishEvent(new TaskDeletedEvent(this, task.getId()));
            }
            broadcastBoardChange(boardId, "COLUMN_TASKS_DELETED", "");
        }
    }

    // ========================================================================
    // 2. PRIVATE HELPER METHODS (VALIDATION & LOGIC)
    // ========================================================================

    private void broadcastBoardChange(String boardId, String action, String taskId) {
        if (boardId != null) {
            String payload = String.format("{\"action\":\"%s\", \"taskId\":\"%s\"}", action, taskId != null ? taskId : "");
            messagingTemplate.convertAndSend("/topic/board/" + boardId, payload);
        }
    }

    private TaskEntity findTaskById(String taskId) {
        return taskRepository.findByIdAndDeletedFalse(taskId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Task not found."));
    }

    private ProjectEntity findProjectById(String projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Project not found."));
    }

    private BoardEntity findBoardById(String boardId) {
        BoardEntity board = boardRepository.findByIdAndDeletedFalse(boardId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board not found."));
        if (!projectRepository.existsByIdAndDeletedFalse(board.getProjectId())) {
            throw new AppException(ErrorCode.NOT_FOUND, "Board not found.");
        }
        return board;
    }

    private BoardColumnEntity findBoardColumnById(String columnId) {
        BoardColumnEntity column = boardColumnRepository.findByIdAndDeletedFalse(columnId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Board column not found."));
        findBoardById(column.getBoardId());
        return column;
    }

    private String validateAndNormalizeParentTask(String parentTaskId, String columnId, String boardId, String selfTaskId) {
        String normalizedParentTaskId = TextUtils.trimToNull(parentTaskId);
        if (normalizedParentTaskId == null) return null;

        if (selfTaskId != null && selfTaskId.equals(normalizedParentTaskId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Task cannot be parent of itself.");
        }

        TaskEntity parentTask = taskRepository.findByIdAndDeletedFalse(normalizedParentTaskId)
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Parent task does not exist."));
        BoardColumnEntity parentColumn = findBoardColumnById(parentTask.getColumnId());
        
        if (!boardId.equals(parentColumn.getBoardId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Parent task must belong to the same board.");
        }
        if (!columnId.equals(parentTask.getColumnId())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Subtask must belong to the same column as parent task.");
        }

        if (selfTaskId != null) validateNoParentCycle(selfTaskId, normalizedParentTaskId);

        return normalizedParentTaskId;
    }

    private void validateNoParentCycle(String selfTaskId, String candidateParentTaskId) {
        String cursor = TextUtils.trimToNull(candidateParentTaskId);
        Set<String> visited = new LinkedHashSet<>();

        while (cursor != null) {
            if (!visited.add(cursor) || selfTaskId.equals(cursor)) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Circular parent reference is not allowed.");
            }
            TaskEntity current = taskRepository.findByIdAndDeletedFalse(cursor)
                    .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST, "Parent task does not exist."));
            cursor = TextUtils.trimToNull(current.getParentTaskId());
        }
    }

    private void validateUserExists(String userId, String message) {
        if (!userRepository.existsByIdAndDeletedFalse(userId)) {
            throw new AppException(ErrorCode.BAD_REQUEST, message);
        }
    }

    private void validateUsersExist(List<String> userIds, String prefixMessage) {
        for (String userId : userIds) {
            if (!userRepository.existsByIdAndDeletedFalse(userId)) {
                throw new AppException(ErrorCode.BAD_REQUEST, prefixMessage + userId);
            }
        }
    }

    private String requireAuthenticatedUserId(String userId) {
        String normalizedUserId = TextUtils.trimToNull(userId);
        if (normalizedUserId == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user is required.");
        }
        return normalizedUserId;
    }

    private void validateDateRange(Instant startDate, Instant dueDate) {
        if (startDate != null && dueDate != null && dueDate.isBefore(startDate)) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Due date must be after or equal to start date.");
        }
    }

    private List<String> normalizeIdList(List<String> values) {
        if (values == null || values.isEmpty()) return List.of();
        return values.stream()
                .map(TextUtils::trimToNull)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private int resolveUpdateOrder(String columnId, String parentTaskId, Integer requestedOrder, Integer currentOrderIfSameGroup) {
        if (requestedOrder == null) {
            return currentOrderIfSameGroup != null ? currentOrderIfSameGroup : nextOrder(columnId, parentTaskId);
        }
        int maxOrder = currentOrderIfSameGroup != null ? Math.max(listSize(columnId, parentTaskId), 1) : nextOrder(columnId, parentTaskId);
        return Math.min(Math.max(requestedOrder, 1), maxOrder);
    }

    private int nextOrder(String columnId, String parentTaskId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        return tasks.isEmpty() ? 1 : tasks.get(tasks.size() - 1).getOrder() + 1;
    }

    private int listSize(String columnId, String parentTaskId) {
        return findTasksByColumnAndParent(columnId, parentTaskId).size();
    }

    private void shiftOrdersForInsert(String columnId, String parentTaskId, int fromOrder, String exceptId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) continue;
            if (task.getOrder() >= fromOrder) task.setOrder(task.getOrder() + 1);
        }
        taskRepository.saveAll(tasks);
    }

    private void shiftOrdersAfterDelete(String columnId, String parentTaskId, int fromOrder, String exceptId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) continue;
            if (task.getOrder() > fromOrder) task.setOrder(task.getOrder() - 1);
        }
        taskRepository.saveAll(tasks);
    }

    private void moveInsideColumnGroup(String columnId, String parentTaskId, int currentOrder, int targetOrder, String taskId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (taskId.equals(task.getId())) continue;
            int order = task.getOrder();
            if (targetOrder > currentOrder && order > currentOrder && order <= targetOrder) {
                task.setOrder(order - 1);
            } else if (targetOrder <= currentOrder && order >= targetOrder && order < currentOrder) {
                task.setOrder(order + 1);
            }
        }
        taskRepository.saveAll(tasks);
    }

    private List<TaskEntity> findTasksByColumnAndParent(String columnId, String parentTaskId) {
        String normalizedParentTaskId = TextUtils.trimToNull(parentTaskId);
        return taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(columnId).stream()
                .filter(task -> sameParentTask(TextUtils.trimToNull(task.getParentTaskId()), normalizedParentTaskId))
                .toList();
    }

    private boolean sameParentTask(String firstParentTaskId, String secondParentTaskId) {
        String nFirst = TextUtils.trimToNull(firstParentTaskId);
        String nSecond = TextUtils.trimToNull(secondParentTaskId);
        if (nFirst == null) return nSecond == null;
        return nFirst.equals(nSecond);
    }

    private Map<String, List<TaskEntity>> buildChildrenByParentId(List<TaskEntity> tasks) {
        Map<String, List<TaskEntity>> result = new HashMap<>();
        for (TaskEntity task : tasks) {
            String parentTaskId = TextUtils.trimToNull(task.getParentTaskId());
            if (parentTaskId != null) {
                result.computeIfAbsent(parentTaskId, k -> new ArrayList<>()).add(task);
            }
        }
        return result;
    }

    private Set<String> collectSubtreeTaskIds(String rootTaskId, Map<String, List<TaskEntity>> childrenByParentId) {
        Set<String> result = new LinkedHashSet<>();
        List<String> stack = new ArrayList<>();
        stack.add(rootTaskId);

        while (!stack.isEmpty()) {
            String currentTaskId = stack.remove(stack.size() - 1);
            if (result.add(currentTaskId)) {
                List<TaskEntity> children = childrenByParentId.getOrDefault(currentTaskId, List.of());
                children.forEach(child -> stack.add(child.getId()));
            }
        }
        return result;
    }

    private List<TaskEntity> resequenceAfterDelete(List<TaskEntity> columnTasks, Set<String> deletedTaskIds, Set<String> affectedGroupKeys) {
        List<TaskEntity> result = new ArrayList<>();
        for (String groupKey : affectedGroupKeys) {
            String parentTaskId = fromGroupKey(groupKey);
            List<TaskEntity> siblings = columnTasks.stream()
                    .filter(task -> !deletedTaskIds.contains(task.getId()))
                    .filter(task -> sameParentTask(task.getParentTaskId(), parentTaskId))
                    .toList();

            int expectedOrder = 1;
            for (TaskEntity sibling : siblings) {
                if (sibling.getOrder() != expectedOrder) {
                    sibling.setOrder(expectedOrder);
                    result.add(sibling);
                }
                expectedOrder++;
            }
        }
        return result;
    }

    private String toGroupKey(String parentTaskId) {
        String normalized = TextUtils.trimToNull(parentTaskId);
        return normalized == null ? "__ROOT__" : normalized;
    }

    private String fromGroupKey(String groupKey) {
        return "__ROOT__".equals(groupKey) ? null : groupKey;
    }

    private boolean sameText(String first, String second) {
        String nFirst = TextUtils.trimToNull(first);
        String nSecond = TextUtils.trimToNull(second);
        if (nFirst == null) return nSecond == null;
        return nFirst.equals(nSecond);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Page<TaskResponse> toResponsePage(Page<TaskEntity> entityPage) {
        List<TaskEntity> entities = entityPage.getContent();
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(entities);
        List<TaskResponse> responses = entities.stream().map(entity -> toResponse(entity, users)).toList();
        return new PageImpl<>(responses, entityPage.getPageable(), entityPage.getTotalElements());
    }

    private Map<String, TaskUserSummaryResponse> resolveUserSummaries(List<TaskEntity> entities) {
        if (entities == null || entities.isEmpty()) return Map.of();

        Set<String> userIds = new LinkedHashSet<>();
        for (TaskEntity entity : entities) {
            String authorUserId = TextUtils.trimToNull(entity.getAuthorUserId());
            if (authorUserId != null) userIds.add(authorUserId);

            if (entity.getAssigneesUserId() != null) {
                entity.getAssigneesUserId().stream()
                        .map(TextUtils::trimToNull)
                        .filter(Objects::nonNull)
                        .forEach(userIds::add);
            }
        }

        if (userIds.isEmpty()) return Map.of();

        return userRepository.findByIdInAndDeletedFalse(new ArrayList<>(userIds))
                .stream()
                .collect(Collectors.toMap(
                        user -> String.valueOf(user.getId()),
                        user -> new TaskUserSummaryResponse(String.valueOf(user.getId()), user.getFullName(), user.getAvatarUrl())
                ));
    }

    private TaskResponse toResponse(TaskEntity entity, Map<String, TaskUserSummaryResponse> users) {
        List<TaskUserSummaryResponse> assignees = entity.getAssigneesUserId() == null ? List.of() :
                entity.getAssigneesUserId().stream()
                        .map(TextUtils::trimToNull)
                        .filter(Objects::nonNull)
                        .map(assigneeId -> users.getOrDefault(assigneeId, new TaskUserSummaryResponse(assigneeId, "User(" + assigneeId.substring(0, 4) + ")", null)))
                        .toList();

        String authorId = TextUtils.trimToNull(entity.getAuthorUserId());
        TaskUserSummaryResponse author = authorId == null ? null : users.get(authorId);

        return new TaskResponse(
                entity.getId(), entity.getTitle(), entity.getDescription(), entity.getParentTaskId(),
                assignees, entity.getPriority(), entity.getStartDate(), entity.getDueDate(),
                entity.getStatus(), entity.getStoryPoint(), entity.getEstimatedDate(), entity.getOrder(),
                entity.getAiSuggestedPoint(), entity.getAiEstimatedReason(), author, entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }
}