package com.fluxboard.dashboard.service;

import com.fluxboard.auth.model.AuthenticatedUser;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.rbac.entity.RoleEntity;
import com.fluxboard.rbac.enums.Role;
import com.fluxboard.rbac.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {
    private static final long DEFAULT_CAPACITY_POINTS = 20;
    private final MongoTemplate mongoTemplate;
    private final RoleRepository roleRepository;

    public Map<String, Object> getDashboardMetrics(String timeRange, String departmentId, String teamId, AuthenticatedUser currentUser) {
        RoleEntity role = roleRepository.findById(currentUser.roleId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Không tìm thấy quyền hạn người dùng."));
        String roleName = role.getName().name().toUpperCase();

        if ("SYSTEM_ADMIN".equals(roleName) || "ADMIN".equals(roleName)) return getAdminMetrics(timeRange, departmentId);
        if (roleName.contains("MANAGER") || roleName.contains("LEAD") || roleName.contains("PM") || roleName.contains("PROJECT_ADMIN")) {
            String managedDeptId = trimToNull(departmentId);
            if (managedDeptId == null) managedDeptId = findManagedDepartmentId(currentUser.userId());
            return getManagerMetrics(timeRange, managedDeptId, teamId, currentUser.userId());
        }
        return getMemberMetrics(currentUser.userId(), timeRange);
    }

    private Map<String, Object> getAdminMetrics(String timeRange, String departmentId) {
        Instant from = resolveFrom(timeRange);
        Map<String, Object> result = new LinkedHashMap<>();

        long totalUsers = countActive("users");
        long totalDepartments = countActive("departments");
        long totalTeams = countActive("teams");
        long totalProjects = countActive("projects");
        result.put("organization_kpi", Map.of(
                "total_users", totalUsers,
                "total_departments", totalDepartments,
                "total_teams", totalTeams,
                "total_projects", totalProjects
        ));

        List<Map> deadlines = findActive("task_deadlines", from);
        long onTrack = deadlines.stream().filter(d -> "ON_TRACK".equals(str(d.get("status")))).count();
        long atRisk = deadlines.stream().filter(d -> "AT_RISK".equals(str(d.get("status")))).count();
        long overdue = deadlines.stream().filter(d -> Set.of("OVERDUE", "LATE").contains(str(d.get("status")))).count();
        long totalExtensions = deadlines.stream().mapToLong(d -> longVal(d.get("extension_count"))).sum();

        List<Map<String, Object>> chartSegments = List.of(
                chartSegment("on_track", "Đúng hạn", onTrack, "#22c55e"),
                chartSegment("at_risk", "Có rủi ro", atRisk, "#f59e0b"),
                chartSegment("overdue", "Quá hạn", overdue, "#ef4444"),
                chartSegment("total_extensions", "Dời hạn", totalExtensions, "#3b82f6")
        );
        result.put("company_deadline_health", Map.of(
                "on_track", onTrack,
                "at_risk", atRisk,
                "overdue", overdue,
                "total_extensions", totalExtensions,
                "chart_segments", chartSegments
        ));

        List<Map> users = findActive("users", null);
        List<Map> departments = findActive("departments", null);
        List<Map> tasks = findActive("tasks", from);
        Map<String, Map> usersById = indexById(users);
        Map<String, String> deptNames = departments.stream()
                .filter(d -> idOf(d) != null)
                .collect(Collectors.toMap(this::idOf, d -> firstNonBlank(str(d.get("name")), "Chưa phân bổ"), (a, b) -> a, LinkedHashMap::new));

        Map<String, DepartmentAgg> deptAgg = new LinkedHashMap<>();
        for (Map task : tasks) {
            if (task.get("story_point") == null) continue;

            Set<String> taskDeptIds = assignees(task).stream()
                    .map(usersById::get)
                    .filter(Objects::nonNull)
                    .map(u -> str(u.get("department_id")))
                    .filter(Objects::nonNull)
                    .filter(id -> trimToNull(departmentId) == null || id.equals(departmentId))
                    .collect(Collectors.toCollection(LinkedHashSet::new));

            if (taskDeptIds.isEmpty()) taskDeptIds.add("Unassigned");

            for (String deptId : taskDeptIds) {
                DepartmentAgg agg = deptAgg.computeIfAbsent(deptId, id -> new DepartmentAgg(id, deptNames.getOrDefault(id, "Chưa phân bổ")));
                long point = longVal(task.get("story_point"));
                agg.totalPoints += point;
                if ("DONE".equals(str(task.get("status")))) agg.completedPoints += point;
                if (isTaskOverdue(task, deadlines)) agg.overdueTasks++;
            }
        }

        List<Map<String, Object>> departmentPerformance = deptAgg.values().stream().map(agg -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("department_id", agg.departmentId);
            m.put("department_name", agg.departmentName);
            m.put("total_points", agg.totalPoints);
            m.put("completed_points", agg.completedPoints);
            m.put("overdue_tasks", agg.overdueTasks);
            m.put("completion_rate", percent(agg.completedPoints, agg.totalPoints));
            return m;
        }).toList();

        result.put("department_performance", departmentPerformance);
        result.put("department_points_distribution", departmentPerformance);

        Query logQuery = activeQuery(null).with(Sort.by(Sort.Direction.DESC, "created_at")).limit(10);
        List<Map> logs = mongoTemplate.find(logQuery, Map.class, "activities");
        result.put("critical_audit_logs", logs.stream().map(this::activitySummary).toList());
        return result;
    }

    private Map<String, Object> getManagerMetrics(String timeRange, String managedDeptId, String teamId, String managerId) {
        Instant from = resolveFrom(timeRange);
        Map<String, Object> result = new LinkedHashMap<>();

        List<Map> users = findActive("users", null);
        List<Map> allTasks = findActive("tasks", from);
        List<Map> deadlines = findActive("task_deadlines", null);
        Map<String, Map> usersById = indexById(users);
        Map<String, Map> deadlineByTaskId = deadlines.stream()
                .filter(d -> str(d.get("task_id")) != null)
                .collect(Collectors.toMap(d -> str(d.get("task_id")), Function.identity(), (a, b) -> a));

        Set<String> managedProjectIds = resolveManagedProjectIds(managerId, managedDeptId);
        if (managedProjectIds.isEmpty()) {
            result.put("team_workload_capacity", List.of());
            result.put("team_deadline_status", Map.of("on_track", 0, "at_risk", 0, "overdue", 0, "late", 0));
            result.put("at_risk_tasks", List.of());
            result.put("ai_efficiency", List.of());
            return result;
        }

        List<Map> projectTasks = allTasks.stream()
                .filter(task -> managedProjectIds.contains(str(task.get("project_id"))))
                .toList();

        Set<String> scopedUserIds = projectTasks.stream()
                .flatMap(task -> assignees(task).stream())
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        scopedUserIds.removeIf(userId -> {
            Map user = usersById.get(userId);
            if (user == null) return true;
            if (isSystemAccount(user)) return true;
            if (managedDeptId != null && !managedDeptId.equals(str(user.get("department_id")))) return true;
            return trimToNull(teamId) != null && !teamId.equals(str(user.get("team_id")));
        });

        List<Map> scopedTasks = projectTasks.stream()
                .filter(task -> assignees(task).stream().anyMatch(scopedUserIds::contains))
                .toList();

        Map<String, Long> pointByUser = new LinkedHashMap<>();
        for (String uid : scopedUserIds) pointByUser.put(uid, 0L);

        for (Map task : scopedTasks) {
            if ("DONE".equals(str(task.get("status")))) continue;
            long point = longVal(task.get("story_point"));
            for (String uid : assignees(task)) {
                if (scopedUserIds.contains(uid)) pointByUser.put(uid, pointByUser.getOrDefault(uid, 0L) + point);
            }
        }

        List<Map<String, Object>> workload = pointByUser.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> {
                    Map user = usersById.get(e.getKey());
                    long points = e.getValue();
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("user_id", e.getKey());
                    m.put("full_name", user != null ? firstNonBlank(str(user.get("full_name")), str(user.get("name")), "Thành viên " + shortId(e.getKey())) : "Thành viên " + shortId(e.getKey()));
                    m.put("current_points", points);
                    m.put("capacity_points", DEFAULT_CAPACITY_POINTS);
                    m.put("load_percentage", percent(points, DEFAULT_CAPACITY_POINTS));
                    m.put("status", points > DEFAULT_CAPACITY_POINTS ? "OVERLOADED" : "AVAILABLE");
                    return m;
                }).toList();

        result.put("team_workload_capacity", workload);

        long onTrack = 0, atRisk = 0, overdue = 0, late = 0;
        List<Map<String, Object>> atRiskTasks = new ArrayList<>();

        for (Map task : scopedTasks) {
            Map deadline = deadlineByTaskId.get(idOf(task));
            String status = deadline != null ? str(deadline.get("status")) : str(task.get("status"));

            if ("ON_TRACK".equals(status)) onTrack++;
            else if ("AT_RISK".equals(status)) atRisk++;
            else if ("OVERDUE".equals(status)) overdue++;
            else if ("LATE".equals(status)) late++;

            if (Set.of("AT_RISK", "OVERDUE", "LATE").contains(status) && atRiskTasks.size() < 10) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("task_id", idOf(task));
                m.put("title", firstNonBlank(str(task.get("title")), "Chưa có tiêu đề"));
                m.put("story_point", intVal(task.get("story_point")));
                m.put("priority", firstNonBlank(str(task.get("priority")), "NORMAL"));
                m.put("due_date", deadline != null ? deadline.get("due_date") : task.get("due_date"));
                m.put("deadline_status", status);
                m.put("extension_count", deadline != null ? intVal(deadline.get("extension_count")) : 0);
                m.put("action_url", buildTaskUrl(task));
                atRiskTasks.add(m);
            }
        }

        result.put("team_deadline_status", Map.of("on_track", onTrack, "at_risk", atRisk, "overdue", overdue, "late", late));
        result.put("at_risk_tasks", atRiskTasks);

        List<Map<String, Object>> aiEfficiency = scopedTasks.stream()
                .filter(t -> t.get("ai_suggested_point") != null && t.get("story_point") != null)
                .sorted((a, b) -> compareCreatedAtDesc(a.get("created_at"), b.get("created_at")))
                .limit(10)
                .map(task -> {
                    double ai = doubleVal(task.get("ai_suggested_point"));
                    double actual = doubleVal(task.get("story_point"));
                    double deviation = ai > 0 ? ((actual - ai) / ai) * 100.0 : 0.0;
                    double accuracy = Math.max(0.0, 100.0 - Math.abs(deviation));
                    String status = Math.abs(deviation) <= 10 ? "ACCURATE" : deviation > 10 ? "UNDERESTIMATED" : "OVERESTIMATED";

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("task_id", idOf(task));
                    m.put("task_title", firstNonBlank(str(task.get("title")), "Untitled Task"));
                    m.put("ai_suggested_point", round(ai));
                    m.put("actual_point", round(actual));
                    m.put("manual_point", round(actual));
                    m.put("deviation_point", round(actual - ai));
                    m.put("deviation_percentage", round(deviation));
                    m.put("accuracy_score", round(accuracy));
                    m.put("deviation_status", status);
                    m.put("evaluation_comment", buildAiEvaluationComment(status, deviation));
                    return m;
                }).toList();

        result.put("ai_efficiency", aiEfficiency);
        return result;
    }

    private Map<String, Object> getMemberMetrics(String userId, String timeRange) {
        Instant from = resolveFrom(timeRange);
        Map<String, Object> result = new LinkedHashMap<>();

        List<Map> tasks = findActive("tasks", from).stream()
                .filter(t -> assignees(t).contains(userId))
                .toList();

        List<Map> deadlines = findActive("task_deadlines", null);
        Map<String, Map> deadlineByTaskId = deadlines.stream()
                .filter(d -> str(d.get("task_id")) != null)
                .collect(Collectors.toMap(d -> str(d.get("task_id")), Function.identity(), (a, b) -> a));

        long total = tasks.size();
        long completed = tasks.stream().filter(t -> "DONE".equals(str(t.get("status")))).count();
        long totalPoints = tasks.stream().mapToLong(t -> longVal(t.get("story_point"))).sum();
        long completedPoints = tasks.stream().filter(t -> "DONE".equals(str(t.get("status")))).mapToLong(t -> longVal(t.get("story_point"))).sum();

        result.put("my_contribution", Map.of(
                "completed_tasks", completed,
                "total_assigned", total,
                "completion_rate", percent(completed, total),
                "completed_points", completedPoints,
                "total_points", totalPoints
        ));

        List<Map<String, Object>> focus = tasks.stream()
                .filter(t -> !"DONE".equals(str(t.get("status"))))
                .filter(t -> Set.of("HIGH", "CRITICAL").contains(str(t.get("priority"))))
                .sorted(Comparator.comparing(t -> instantVal(deadlineByTaskId.get(idOf(t)) != null ? deadlineByTaskId.get(idOf(t)).get("due_date") : t.get("due_date")), Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(5)
                .map(t -> {
                    Map d = deadlineByTaskId.get(idOf(t));
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("task_id", idOf(t));
                    m.put("title", t.get("title"));
                    m.put("priority", t.get("priority"));
                    m.put("story_point", intVal(t.get("story_point")));
                    m.put("due_date", d != null ? d.get("due_date") : t.get("due_date"));
                    m.put("deadline_status", d != null ? d.get("status") : "ON_TRACK");
                    m.put("extensions_used", d != null ? intVal(d.get("extension_count")) : 0);
                    m.put("extension_limit", d != null ? intVal(d.get("extension_limit")) : 0);
                    m.put("action_url", buildTaskUrl(t));
                    return m;
                }).toList();

        result.put("my_focus_board", focus);
        return result;
    }

    private Set<String> resolveManagedProjectIds(String managerId, String managedDeptId) {
        Set<String> ids = new LinkedHashSet<>();

        for (Map project : findActive("projects", null)) {
            String projectId = idOf(project);
            if (projectId == null) continue;

            boolean ownedByManager = managerId != null && managerId.equals(str(project.get("owner_id")));
            boolean inManagedDepartment = managedDeptId != null && managedDeptId.equals(str(project.get("department_id")));
            if (ownedByManager || inManagedDepartment) ids.add(projectId);
        }

        Query memberQuery = new Query(Criteria.where("user_id").is(managerId)
                .and("is_active").is(true)
                .and("is_deleted").ne(true));

        List<Map> memberships = mongoTemplate.find(memberQuery, Map.class, "project_members");
        if (memberships.isEmpty()) memberships = mongoTemplate.find(memberQuery, Map.class, "projectmembers");

        for (Map member : memberships) {
            String projectId = str(member.get("project_id"));
            if (projectId != null && !projectId.isBlank()) ids.add(projectId);
        }

        return ids;
    }

    private String findManagedDepartmentId(String userId) {
        Query q = new Query(Criteria.where("manager_id").is(userId).and("is_deleted").ne(true)).limit(1);
        Map dept = mongoTemplate.findOne(q, Map.class, "departments");
        return dept == null ? null : idOf(dept);
    }

    private boolean isSystemAccount(Map user) {
        if (user == null) return false;
        String roleId = str(user.get("role_id"));
        if (roleId == null || roleId.isBlank()) return false;

        RoleEntity role = roleRepository.findById(roleId).orElse(null);
        if (role == null || role.getName() == null) return false;

        Role name = role.getName();
        return name == Role.SYSTEM_ADMIN || name == Role.ADMIN;
    }

    private boolean isTaskOverdue(Map task, List<Map> deadlines) {
        String taskId = idOf(task);
        return deadlines.stream().anyMatch(d -> taskId.equals(str(d.get("task_id"))) && Set.of("OVERDUE", "LATE").contains(str(d.get("status"))));
    }

    private List<String> assignees(Map task) {
        Object raw = task.get("assignees_user_id");
        if (!(raw instanceof Collection<?> c)) return List.of();
        return c.stream().map(String::valueOf).filter(s -> !s.isBlank()).distinct().toList();
    }

    private String buildTaskUrl(Map task) {
        Object boardId = task.get("board_id");
        if (boardId == null && task.get("column_id") != null) {
            Map col = mongoTemplate.findOne(new Query(Criteria.where("_id").is(toId(task.get("column_id")))), Map.class, "board_column");
            if (col == null) col = mongoTemplate.findOne(new Query(Criteria.where("_id").is(toId(task.get("column_id")))), Map.class, "board_columns");
            if (col != null) boardId = col.get("board_id");
        }
        String taskId = idOf(task);
        return boardId == null || taskId == null ? null : "/board/" + boardId + "?taskId=" + taskId;
    }

    private List<Map> findActive(String collection, Instant from) {
        Query q = activeQuery(from);
        return mongoTemplate.find(q, Map.class, collection);
    }

    private Query activeQuery(Instant from) {
        Criteria c = Criteria.where("is_deleted").ne(true);
        if (from != null) c = c.and("created_at").gte(from);
        return new Query(c);
    }

    private long countActive(String collection) {
        return mongoTemplate.count(activeQuery(null), collection);
    }

    private Map<String, Map> indexById(List<Map> docs) {
        return docs.stream()
                .filter(d -> idOf(d) != null)
                .collect(Collectors.toMap(this::idOf, Function.identity(), (a, b) -> a, LinkedHashMap::new));
    }

    private Map<String, Object> chartSegment(String key, String label, long value, String color) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("value", value);
        m.put("color", color);
        return m;
    }

    private Map<String, Object> activitySummary(Map log) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", idOf(log));
        m.put("source_type", log.get("source_type"));
        m.put("action", log.get("action"));
        m.put("description", firstNonBlank(str(log.get("description")), str(log.get("message"))));
        m.put("created_at", log.get("created_at"));
        m.put("actor_user_id", log.get("actor_user_id"));
        return m;
    }

    private String buildAiEvaluationComment(String status, double deviation) {
        if ("ACCURATE".equals(status)) return "AI ước lượng sát với story point thực tế của team.";
        if ("UNDERESTIMATED".equals(status)) return "AI ước lượng thấp hơn thực tế, task tốn thêm " + round(Math.abs(deviation)) + "% nỗ lực.";
        return "AI ước lượng cao hơn thực tế, team làm ít hơn " + round(Math.abs(deviation)) + "% so với dự đoán.";
    }

    private Instant resolveFrom(String timeRange) {
        if (timeRange == null || timeRange.isBlank() || "all".equalsIgnoreCase(timeRange)) return null;
        String v = timeRange.trim().toLowerCase();
        if (v.contains("7")) return Instant.now().minus(7, ChronoUnit.DAYS);
        if (v.contains("90")) return Instant.now().minus(90, ChronoUnit.DAYS);
        return Instant.now().minus(30, ChronoUnit.DAYS);
    }

    private Object toId(Object value) {
        if (value instanceof ObjectId) return value;
        if (value instanceof String s && ObjectId.isValid(s)) return new ObjectId(s);
        return value;
    }

    private String idOf(Map doc) {
        if (doc == null) return null;
        Object id = doc.get("_id");
        return id == null ? null : id.toString();
    }

    private String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private String trimToNull(String v) {
        if (v == null) return null;
        String s = v.trim();
        return s.isEmpty() ? null : s;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            String s = trimToNull(v);
            if (s != null) return s;
        }
        return null;
    }

    private String shortId(String id) {
        return id == null ? "unknown" : id.substring(0, Math.min(4, id.length()));
    }

    private int intVal(Object v) {
        return v instanceof Number n ? n.intValue() : 0;
    }

    private long longVal(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }

    private double doubleVal(Object v) {
        return v instanceof Number n ? n.doubleValue() : 0.0;
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private double percent(double part, double total) {
        return total <= 0 ? 0.0 : round((part / total) * 100.0);
    }

    private Instant instantVal(Object v) {
        return v instanceof Date d ? d.toInstant() : v instanceof Instant i ? i : null;
    }

    private int compareCreatedAtDesc(Object a, Object b) {
        Instant ia = instantVal(a), ib = instantVal(b);
        if (ia == null && ib == null) return 0;
        if (ia == null) return 1;
        if (ib == null) return -1;
        return ib.compareTo(ia);
    }

    private static class DepartmentAgg {
        final String departmentId;
        final String departmentName;
        long totalPoints;
        long completedPoints;
        long overdueTasks;

        DepartmentAgg(String departmentId, String departmentName) {
            this.departmentId = departmentId;
            this.departmentName = departmentName;
        }
    }
}