package com.fluxboard.board.task.service;

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
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;

@Service
public class TaskService implements CrudService<TaskResponse, String, CreateTaskRequest, UpdateTaskRequest> {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final BoardRepository boardRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final UserRepository userRepository;

    public TaskService(
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            BoardRepository boardRepository,
            BoardColumnRepository boardColumnRepository,
            UserRepository userRepository
    ) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.boardRepository = boardRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.userRepository = userRepository;
    }

    @Override
    public TaskResponse create(CreateTaskRequest request) {
        return create(request, null);
    }

    public TaskResponse create(CreateTaskRequest request, String authorUserId) {
        String columnId = TextUtils.trim(request.columnId());
        BoardColumnEntity column = findBoardColumnById(columnId);
        String boardId = column.getBoardId();

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
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(saved));
        return toResponse(saved, users);
    }

    @Override
    public TaskResponse getById(String id) {
        TaskEntity entity = findTaskById(id);
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(entity));
        return toResponse(entity, users);
    }

    @Override
    public Page<TaskResponse> getPage(Pageable pageable) {
        return toResponsePage(taskRepository.findByDeletedFalse(pageable));
    }

    public Page<TaskResponse> getPageByProject(String projectId, Pageable pageable) {
        String normalizedProjectId = TextUtils.trim(projectId);
        findProjectById(normalizedProjectId);

        List<String> boardIds = boardRepository.findByProjectIdAndDeletedFalse(normalizedProjectId)
                .stream()
                .map(BoardEntity::getId)
                .toList();

        if (boardIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<String> columnIds = boardColumnRepository.findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(boardIds)
                .stream()
                .map(BoardColumnEntity::getId)
                .toList();

        if (columnIds.isEmpty()) {
            return Page.empty(pageable);
        }

        return toResponsePage(taskRepository.findByColumnIdInAndDeletedFalse(columnIds, pageable));
    }

    public Page<TaskResponse> getPageByBoard(String boardId, Pageable pageable) {
        String normalizedBoardId = TextUtils.trim(boardId);
        findBoardById(normalizedBoardId);
        List<String> columnIds = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(normalizedBoardId)
                .stream()
                .map(BoardColumnEntity::getId)
                .toList();

        if (columnIds.isEmpty()) {
            return Page.empty(pageable);
        }

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

        return entities.stream()
                .map(entity -> toResponse(entity, users))
                .toList();
    }

    @Override
    public TaskResponse update(String id, UpdateTaskRequest request) {
        TaskEntity entity = findTaskById(id);

        String columnId = TextUtils.trim(request.columnId());
        BoardColumnEntity column = findBoardColumnById(columnId);
        String boardId = column.getBoardId();

        List<String> assigneesUserId = normalizeIdList(request.assigneesUserId());
        validateUsersExist(assigneesUserId, "Assignee user does not exist: ");

        String parentTaskId = validateAndNormalizeParentTask(request.parentTaskId(), columnId, boardId, id);
        validateDateRange(request.startDate(), request.dueDate());

        String currentColumnId = entity.getColumnId();
        String currentParentTaskId = TextUtils.trimToNull(entity.getParentTaskId());
        int currentOrder = entity.getOrder();
        boolean sameGroup = currentColumnId.equals(columnId)
                && sameParentTask(currentParentTaskId, parentTaskId);
        int targetOrder = resolveUpdateOrder(
                columnId,
                parentTaskId,
                request.order(),
                sameGroup ? currentOrder : null
        );

        if (sameGroup) {
            if (targetOrder != currentOrder) {
                moveInsideColumnGroup(columnId, parentTaskId, currentOrder, targetOrder, entity.getId());
            }
        } else {
            shiftOrdersForInsert(columnId, parentTaskId, targetOrder, null);
            shiftOrdersAfterDelete(currentColumnId, currentParentTaskId, currentOrder, entity.getId());
        }

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
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(saved));
        return toResponse(saved, users);
    }

    @Transactional
    public TaskResponse moveTask(String id, TaskMoveRequest request) {
        try {
            TaskEntity entity = findTaskById(id);
            
            String newColumnId = TextUtils.trim(request.newColumnId());
            BoardColumnEntity newColumn = findBoardColumnById(newColumnId);
            
            BoardColumnEntity currentColumn = findBoardColumnById(entity.getColumnId());
            if (!currentColumn.getBoardId().equals(newColumn.getBoardId())) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Validation Error: Cannot move task to a different board.");
            }

            String currentColumnId = entity.getColumnId();
            String parentTaskId = TextUtils.trimToNull(entity.getParentTaskId());
            int currentOrder = entity.getOrder();

            boolean sameGroup = currentColumnId.equals(newColumnId);
            
            int targetOrder = resolveUpdateOrder(
                    newColumnId,
                    parentTaskId,
                    request.newOrder(),
                    sameGroup ? currentOrder : null
            );

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

            TaskEntity saved = taskRepository.save(entity);
            Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(List.of(saved));
            return toResponse(saved, users);
            
        } catch (DuplicateKeyException e) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Conflict: Another move operation is in progress. Please try again.");
        }
    }

    @Override
    public void delete(String id) {
        TaskEntity entity = findTaskById(id);
        String columnId = entity.getColumnId();

        List<TaskEntity> columnTasks = taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(columnId);
        Map<String, List<TaskEntity>> childrenByParentId = buildChildrenByParentId(columnTasks);
        Set<String> deletedTaskIds = collectSubtreeTaskIds(entity.getId(), childrenByParentId);

        if (deletedTaskIds.isEmpty()) {
            return;
        }

        List<TaskEntity> toDelete = new ArrayList<>();
        Set<String> affectedGroupKeys = new LinkedHashSet<>();

        for (TaskEntity task : columnTasks) {
            if (!deletedTaskIds.contains(task.getId())) {
                continue;
            }
            affectedGroupKeys.add(toGroupKey(task.getParentTaskId()));
            task.markDeleted();
            toDelete.add(task);
        }
        taskRepository.saveAll(toDelete);

        List<TaskEntity> toResequence = resequenceAfterDelete(columnTasks, deletedTaskIds, affectedGroupKeys);
        if (!toResequence.isEmpty()) {
            taskRepository.saveAll(toResequence);
        }
    }

    public void softDeleteByBoardId(String boardId) {
        List<String> columnIds = boardColumnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(boardId))
                .stream()
                .map(BoardColumnEntity::getId)
                .toList();
        if (columnIds.isEmpty()) {
            return;
        }

        List<TaskEntity> tasks = taskRepository.findByColumnIdInAndDeletedFalse(columnIds);
        if (tasks.isEmpty()) {
            return;
        }

        for (TaskEntity task : tasks) {
            task.markDeleted();
        }
        taskRepository.saveAll(tasks);
    }

    public void softDeleteByColumnId(String columnId) {
        List<TaskEntity> tasks = taskRepository.findByColumnIdAndDeletedFalseOrderByOrderAsc(TextUtils.trim(columnId));
        if (tasks.isEmpty()) {
            return;
        }

        for (TaskEntity task : tasks) {
            task.markDeleted();
        }
        taskRepository.saveAll(tasks);
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

    private String validateAndNormalizeParentTask(
            String parentTaskId,
            String columnId,
            String boardId,
            String selfTaskId
    ) {
        String normalizedParentTaskId = TextUtils.trimToNull(parentTaskId);
        if (normalizedParentTaskId == null) {
            return null;
        }

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

        if (selfTaskId != null) {
            validateNoParentCycle(selfTaskId, normalizedParentTaskId);
        }

        return normalizedParentTaskId;
    }

    private void validateNoParentCycle(String selfTaskId, String candidateParentTaskId) {
        String cursor = TextUtils.trimToNull(candidateParentTaskId);
        Set<String> visited = new LinkedHashSet<>();

        while (cursor != null) {
            if (!visited.add(cursor)) {
                throw new AppException(ErrorCode.BAD_REQUEST, "Circular parent reference is not allowed.");
            }

            if (selfTaskId.equals(cursor)) {
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
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        Set<String> unique = new LinkedHashSet<>();
        for (String value : values) {
            String normalized = TextUtils.trimToNull(value);
            if (normalized != null) {
                unique.add(normalized);
            }
        }

        return new ArrayList<>(unique);
    }

    private int resolveUpdateOrder(
            String columnId,
            String parentTaskId,
            Integer requestedOrder,
            Integer currentOrderIfSameGroup
    ) {
        if (requestedOrder == null) {
            if (currentOrderIfSameGroup != null) {
                return currentOrderIfSameGroup;
            }
            return nextOrder(columnId, parentTaskId);
        }

        int maxOrder = currentOrderIfSameGroup != null
                ? Math.max(listSize(columnId, parentTaskId), 1)
                : nextOrder(columnId, parentTaskId);

        return Math.min(Math.max(requestedOrder, 1), maxOrder);
    }

    private int nextOrder(String columnId, String parentTaskId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        if (tasks.isEmpty()) {
            return 1;
        }
        return tasks.get(tasks.size() - 1).getOrder() + 1;
    }

    private int listSize(String columnId, String parentTaskId) {
        return findTasksByColumnAndParent(columnId, parentTaskId).size();
    }

    private void shiftOrdersForInsert(String columnId, String parentTaskId, int fromOrder, String exceptId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) {
                continue;
            }
            if (task.getOrder() >= fromOrder) {
                task.setOrder(task.getOrder() + 1);
            }
        }
        taskRepository.saveAll(tasks);
    }

    private void shiftOrdersAfterDelete(String columnId, String parentTaskId, int fromOrder, String exceptId) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (exceptId != null && exceptId.equals(task.getId())) {
                continue;
            }
            if (task.getOrder() > fromOrder) {
                task.setOrder(task.getOrder() - 1);
            }
        }
        taskRepository.saveAll(tasks);
    }

    private void moveInsideColumnGroup(
            String columnId,
            String parentTaskId,
            int currentOrder,
            int targetOrder,
            String taskId
    ) {
        List<TaskEntity> tasks = findTasksByColumnAndParent(columnId, parentTaskId);
        for (TaskEntity task : tasks) {
            if (taskId.equals(task.getId())) {
                continue;
            }

            int order = task.getOrder();
            if (targetOrder > currentOrder) {
                if (order > currentOrder && order <= targetOrder) {
                    task.setOrder(order - 1);
                }
            } else if (order >= targetOrder && order < currentOrder) {
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
        String normalizedFirstParentTaskId = TextUtils.trimToNull(firstParentTaskId);
        String normalizedSecondParentTaskId = TextUtils.trimToNull(secondParentTaskId);
        if (normalizedFirstParentTaskId == null) {
            return normalizedSecondParentTaskId == null;
        }
        return normalizedFirstParentTaskId.equals(normalizedSecondParentTaskId);
    }

    private Map<String, List<TaskEntity>> buildChildrenByParentId(List<TaskEntity> tasks) {
        Map<String, List<TaskEntity>> result = new HashMap<>();

        for (TaskEntity task : tasks) {
            String parentTaskId = TextUtils.trimToNull(task.getParentTaskId());
            if (parentTaskId == null) {
                continue;
            }
            result.computeIfAbsent(parentTaskId, ignored -> new ArrayList<>()).add(task);
        }

        return result;
    }

    private Set<String> collectSubtreeTaskIds(String rootTaskId, Map<String, List<TaskEntity>> childrenByParentId) {
        Set<String> result = new LinkedHashSet<>();
        List<String> stack = new ArrayList<>();
        stack.add(rootTaskId);

        while (!stack.isEmpty()) {
            String currentTaskId = stack.remove(stack.size() - 1);
            if (!result.add(currentTaskId)) {
                continue;
            }

            List<TaskEntity> children = childrenByParentId.getOrDefault(currentTaskId, List.of());
            for (TaskEntity child : children) {
                stack.add(child.getId());
            }
        }

        return result;
    }

    private List<TaskEntity> resequenceAfterDelete(
            List<TaskEntity> columnTasks,
            Set<String> deletedTaskIds,
            Set<String> affectedGroupKeys
    ) {
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
        String normalizedParentTaskId = TextUtils.trimToNull(parentTaskId);
        return normalizedParentTaskId == null ? "__ROOT__" : normalizedParentTaskId;
    }

    private String fromGroupKey(String groupKey) {
        return "__ROOT__".equals(groupKey) ? null : groupKey;
    }

    private Page<TaskResponse> toResponsePage(Page<TaskEntity> entityPage) {
        List<TaskEntity> entities = entityPage.getContent();
        Map<String, TaskUserSummaryResponse> users = resolveUserSummaries(entities);

        List<TaskResponse> responses = entities.stream()
                .map(entity -> toResponse(entity, users))
                .toList();

        return new PageImpl<>(responses, entityPage.getPageable(), entityPage.getTotalElements());
    }

    private Map<String, TaskUserSummaryResponse> resolveUserSummaries(List<TaskEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return Map.of();
        }

        Set<String> userIds = new LinkedHashSet<>();
        for (TaskEntity entity : entities) {
            String authorUserId = TextUtils.trimToNull(entity.getAuthorUserId());
            if (authorUserId != null) {
                userIds.add(authorUserId);
            }

            if (entity.getAssigneesUserId() != null) {
                for (String assigneeId : entity.getAssigneesUserId()) {
                    String normalized = TextUtils.trimToNull(assigneeId);
                    if (normalized != null) {
                        userIds.add(normalized);
                    }
                }
            }
        }

        if (userIds.isEmpty()) {
            return Map.of();
        }

        List<User> users = userRepository.findByIdInAndDeletedFalse(new ArrayList<>(userIds));
        Map<String, TaskUserSummaryResponse> result = new HashMap<>();
        for (User user : users) {
            result.put(user.getId(), new TaskUserSummaryResponse(user.getId(), user.getFullName(), user.getAvatarUrl()));
        }
        return result;
    }

    private TaskResponse toResponse(TaskEntity entity, Map<String, TaskUserSummaryResponse> users) {
        List<TaskUserSummaryResponse> assignees = entity.getAssigneesUserId() == null
                ? List.of()
                : entity.getAssigneesUserId().stream()
                .map(TextUtils::trimToNull)
                .filter(assigneeId -> assigneeId != null)
                .map(assigneeId -> users.getOrDefault(
                        assigneeId,
                        new TaskUserSummaryResponse(assigneeId, null, null)
                ))
                .toList();

        String authorId = TextUtils.trimToNull(entity.getAuthorUserId());
        TaskUserSummaryResponse author = authorId == null
                ? null
                : users.getOrDefault(authorId, new TaskUserSummaryResponse(authorId, null, null));

        return new TaskResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getParentTaskId(),
                assignees,
                entity.getPriority(),
                entity.getStartDate(),
                entity.getDueDate(),
                entity.getStatus(),
                entity.getStoryPoint(),
                entity.getEstimatedDate(),
                entity.getOrder(),
                entity.getAiSuggestedPoint(),
                entity.getAiEstimatedReason(),
                author,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
