package com.fluxboard.dashboard.service;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.organization.department.service.DepartmentService;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;
    private final DepartmentService departmentService;
    private final MongoTemplate mongoTemplate;

    public DashboardService(UserRepository userRepository,
                            ProjectRepository projectRepository,
                            TaskRepository taskRepository,
                            ActivityRepository activityRepository,
                            DepartmentService departmentService,
                            MongoTemplate mongoTemplate) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.activityRepository = activityRepository;
        this.departmentService = departmentService;
        this.mongoTemplate = mongoTemplate;
    }

    private Map<String, String> getUserNameMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
    }

    private String getRelativeTime(Instant createdAt) {
        if (createdAt == null) return "Gần đây";
        long minutes = Duration.between(createdAt, Instant.now()).toMinutes();
        if (minutes < 60) return minutes + " phút trước";
        long hours = minutes / 60;
        if (hours < 24) return hours + " giờ trước";
        return (hours / 24) + " ngày trước";
    }

    // ========== PHƯƠNG THỨC GỘP (DÙNG CHO ENDPOINT /metrics) ==========
    public Map<String, Object> getDashboardMetrics(String roleName, String currentUserId) {
        if (roleName.contains("ADMIN")) {
            return getSystemAdminMetrics();
        } else if (roleName.contains("MANAGER")) {
            return getManagerMetrics();
        } else if (roleName.contains("LEAD")) {
            return getLeadMetrics();
        } else {
            return getMemberMetrics(currentUserId);
        }
    }

    // ==========================================
    // CÁC PHƯƠNG THỨC PUBLIC CHO TỪNG ROLE (ĐÃ SỬA private -> public)
    // ==========================================

    // 1. ADMIN
    public Map<String, Object> getSystemAdminMetrics() {
    Map<String, Object> data = new HashMap<>();
    Map<String, String> userNames = getUserNameMap();

    // ---------- CARDS ----------
    Map<String, Object> cards = new HashMap<>();
    long totalUsers = userRepository.countByDeletedFalse();
    cards.put("total_users", totalUsers);
    cards.put("total_members", totalUsers);

    List<ProjectEntity> allProjects = projectRepository.findByDeletedFalse();
    long activeProjects = allProjects.stream()
            .filter(p -> p.getStatus() != null && !"ARCHIVED".equalsIgnoreCase(p.getStatus()))
            .count();
    long archivedProjects = allProjects.stream()
            .filter(p -> p.getStatus() != null && "ARCHIVED".equalsIgnoreCase(p.getStatus()))
            .count();

    Map<String, Long> projectsMap = new HashMap<>();
    projectsMap.put("active", activeProjects);
    projectsMap.put("archived", archivedProjects);
    projectsMap.put("total", activeProjects + archivedProjects);
    cards.put("projects", projectsMap);

    cards.put("total_departments", departmentService.getTotalDepartments());
    data.put("cards", cards);

    // ---------- PROJECT STATUS DISTRIBUTION ----------
    Query projQuery = new Query(Criteria.where("is_deleted").is(false));
    projQuery.fields().include("status");
    List<ProjectEntity> projects = mongoTemplate.find(projQuery, ProjectEntity.class);

        Map<String, Long> statusCount = projects.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(ProjectEntity::getStatus, Collectors.counting()));

        List<Map<String, Object>> projectDistribution = new ArrayList<>();
        statusCount.forEach((status, count) -> {
            Map<String, Object> stat = new HashMap<>();
            stat.put("status", status);
            stat.put("count", count);
            String color = "#3b82f6";
            if ("Active".equalsIgnoreCase(status)) color = "#3b82f6";
            else if ("At Risk".equalsIgnoreCase(status)) color = "#ef4444";
            else if ("Delayed".equalsIgnoreCase(status)) color = "#f59e0b";
            else if ("Archived".equalsIgnoreCase(status)) color = "#64748b";
            else if ("Done".equalsIgnoreCase(status)) color = "#10b981";
            stat.put("color", color);
            projectDistribution.add(stat);
        });
        projectDistribution.sort(Comparator.comparing(m -> {
            String status = (String) m.get("status");
            if ("Active".equalsIgnoreCase(status)) return 1;
            if ("At Risk".equalsIgnoreCase(status)) return 2;
            if ("Delayed".equalsIgnoreCase(status)) return 3;
            if ("Archived".equalsIgnoreCase(status)) return 4;
            return 5;
        }));
        data.put("project_status_distribution", projectDistribution);

        // ---------- AT RISK PROJECTS ----------
        List<Map<String, Object>> atRiskProjects = projects.stream()
                .filter(p -> p.getStatus() != null &&
                        ("At Risk".equalsIgnoreCase(p.getStatus()) || "Delayed".equalsIgnoreCase(p.getStatus())))
                .map(p -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", p.getName() != null ? p.getName() : "Unnamed Project");
                    map.put("status", p.getStatus());
                    return map;
                })
                .collect(Collectors.toList());
        data.put("at_risk_projects", atRiskProjects);

        // ---------- AUDIT LOGS ----------
        List<ActivityEntity> recentActivities = activityRepository.findTop10ByOrderByCreatedAtDesc();
        List<Map<String, Object>> auditLogs = recentActivities.stream().map(act -> {
            Map<String, Object> log = new HashMap<>();
            log.put("id", act.getId());
            log.put("actor", act.getActorUserId() != null ? userNames.getOrDefault(act.getActorUserId(), "System") : "System");
            log.put("action", act.getAction());
            log.put("target", act.getMessage() != null ? act.getMessage() : act.getSourceType().toString() + " update");
            boolean isCritical = act.getAction().toString().contains("DELETE");
            log.put("severity", isCritical ? "CRITICAL" : "INFO");
            log.put("created_at", act.getCreatedAt());
            return log;
        }).collect(Collectors.toList());
        data.put("audit_logs", auditLogs);
         List<Map<String, Object>> membersByDept = departmentService.getMemberDistributionByDepartment();
    data.put("members_by_department", membersByDept);

        return data;
    }

    // 2. MANAGER
    public Map<String, Object> getManagerMetrics() {
        Map<String, Object> data = new HashMap<>();
        Map<String, String> userNames = getUserNameMap();

        Query taskQuery = new Query(Criteria.where("is_deleted").is(false));
        taskQuery.fields().include("assigneesUserId", "status", "aiSuggestedPoint", "storyPoint", "title");
        List<TaskEntity> optimizedTasks = mongoTemplate.find(taskQuery, TaskEntity.class);

        Query projQuery = new Query(Criteria.where("is_deleted").is(false));
        projQuery.fields().include("name", "title");
        List<ProjectEntity> allProjects = mongoTemplate.find(projQuery, ProjectEntity.class);
        Map<String, String> projectNames = new HashMap<>();
        for (ProjectEntity p : allProjects) {
            String pName = p.getName() != null ? p.getName() : "Dự án " + p.getId().substring(0, 4);
            projectNames.put(p.getId(), pName);
        }

        Instant fourWeeksAgo = Instant.now().minus(Duration.ofDays(28));
        Query actQuery = new Query(Criteria.where("is_deleted").is(false).and("created_at").gte(fourWeeksAgo));
        actQuery.fields().include("projectId", "createdAt");
        List<ActivityEntity> recentActs = mongoTemplate.find(actQuery, ActivityEntity.class);

        WeekFields weekFields = WeekFields.of(Locale.getDefault());
        Map<String, Map<String, Integer>> weeklyStats = new TreeMap<>();

        for (ActivityEntity act : recentActs) {
            if (act.getProjectId() == null || act.getCreatedAt() == null) continue;
            ZonedDateTime zdt = act.getCreatedAt().atZone(ZoneId.systemDefault());
            int weekNum = zdt.get(weekFields.weekOfWeekBasedYear());
            String weekStr = "W" + weekNum;
            String pName = projectNames.getOrDefault(act.getProjectId(), "Khác");
            weeklyStats.putIfAbsent(weekStr, new HashMap<>());
            Map<String, Integer> projCount = weeklyStats.get(weekStr);
            projCount.put(pName, projCount.getOrDefault(pName, 0) + 1);
        }

        List<Map<String, Object>> weeklyProgress = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> entry : weeklyStats.entrySet()) {
            Map<String, Object> weekData = new HashMap<>();
            weekData.put("week", entry.getKey());
            for (Map.Entry<String, Integer> pEntry : entry.getValue().entrySet()) {
                weekData.put(pEntry.getKey(), pEntry.getValue());
            }
            weeklyProgress.add(weekData);
        }

        if (weeklyProgress.isEmpty()) {
            Map<String, Object> emptyWeek = new HashMap<>();
            int currentWeek = ZonedDateTime.now().get(weekFields.weekOfWeekBasedYear());
            emptyWeek.put("week", "W" + currentWeek);
            emptyWeek.put("Chưa có dữ liệu", 0);
            weeklyProgress.add(emptyWeek);
        }
        data.put("weekly_progress", weeklyProgress);

        // TASK COMPLETION BY TEAM
        Map<String, int[]> userTaskStats = new HashMap<>();
        for (TaskEntity task : optimizedTasks) {
            if (task.getAssigneesUserId() != null && !task.getAssigneesUserId().isEmpty()) {
                for (String userId : task.getAssigneesUserId()) {
                    userTaskStats.putIfAbsent(userId, new int[]{0, 0});
                    userTaskStats.get(userId)[0]++;
                    if ("DONE".equalsIgnoreCase(task.getStatus())) {
                        userTaskStats.get(userId)[1]++;
                    }
                }
            }
        }

        List<Map<String, Object>> completionByTeam = new ArrayList<>();
        for (Map.Entry<String, int[]> entry : userTaskStats.entrySet()) {
            String userId = entry.getKey();
            int totalTasks = entry.getValue()[0];
            int completedTasks = entry.getValue()[1];
            double percentage = totalTasks == 0 ? 0 : Math.round(((double) completedTasks / totalTasks) * 100);
            Map<String, Object> stat = new HashMap<>();
            stat.put("team", userNames.getOrDefault(userId, "Ẩn danh"));
            stat.put("percentage", percentage);
            completionByTeam.add(stat);
        }
        if (completionByTeam.isEmpty()) {
            completionByTeam.add(Map.of("team", "Chưa có dữ liệu", "percentage", 0));
        }
        data.put("task_completion_by_team", completionByTeam);

        // AI VS ACTUAL POINTS
        List<Map<String, Object>> aiPoints = optimizedTasks.stream()
                .filter(t -> t.getAiSuggestedPoint() != null && t.getStoryPoint() != null)
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("task_id", t.getTitle());
                    map.put("ai_point", t.getAiSuggestedPoint());
                    map.put("actual_point", t.getStoryPoint());
                    return map;
                })
                .limit(10)
                .collect(Collectors.toList());
        data.put("ai_vs_actual_points", aiPoints);

        return data;
    }

    // 3. LEAD
    public Map<String, Object> getLeadMetrics() {
        Map<String, Object> data = new HashMap<>();
        Map<String, String> userNames = getUserNameMap();

        Query taskQuery = new Query(Criteria.where("is_deleted").is(false));
        taskQuery.fields().include("assigneesUserId", "status", "storyPoint", "dueDate", "title", "priority");
        List<TaskEntity> optimizedTasks = mongoTemplate.find(taskQuery, TaskEntity.class);

        Map<String, Integer> workloadMap = new HashMap<>();
        for (TaskEntity task : optimizedTasks) {
            if (task.getAssigneesUserId() != null && !"DONE".equalsIgnoreCase(task.getStatus()) && task.getStoryPoint() != null) {
                for (String userId : task.getAssigneesUserId()) {
                    workloadMap.put(userId, workloadMap.getOrDefault(userId, 0) + task.getStoryPoint());
                }
            }
        }

        List<Map<String, Object>> teamWorkload = workloadMap.entrySet().stream()
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("user_id", entry.getKey());
                    map.put("name", userNames.getOrDefault(entry.getKey(), "Unknown"));
                    map.put("total_points", entry.getValue());
                    return map;
                })
                .sorted((a, b) -> (Integer) b.get("total_points") - (Integer) a.get("total_points"))
                .collect(Collectors.toList());
        data.put("team_workload", teamWorkload);

        Instant now = Instant.now();
        List<Map<String, Object>> atRiskTasks = optimizedTasks.stream()
                .filter(t -> !"DONE".equalsIgnoreCase(t.getStatus()) && t.getDueDate() != null && t.getDueDate().isBefore(now))
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", t.getId());
                    map.put("title", t.getTitle());
                    map.put("due_date", t.getDueDate().toString().substring(0, 10));
                    map.put("priority", t.getPriority() != null ? t.getPriority() : "HIGH");
                    map.put("reason", "OVERDUE");
                    return map;
                })
                .limit(10)
                .collect(Collectors.toList());
        data.put("at_risk_tasks", atRiskTasks);

        List<ActivityEntity> recentActivities = activityRepository.findTop10ByOrderByCreatedAtDesc();
        List<Map<String, Object>> recentActs = recentActivities.stream()
                .limit(5)
                .map(act -> {
                    Map<String, Object> map = new HashMap<>();
                    String userName = act.getActorUserId() != null ? userNames.getOrDefault(act.getActorUserId(), "System") : "System";
                    String[] nameParts = userName.split(" ");
                    String shortName = nameParts[nameParts.length - 1];
                    map.put("user", shortName);
                    map.put("content", act.getMessage() != null ? act.getMessage() : String.valueOf(act.getAction()));
                    map.put("time", getRelativeTime(act.getCreatedAt()));
                    return map;
                }).collect(Collectors.toList());
        data.put("recent_activities", recentActs);

        return data;
    }

    // 4. MEMBER
    public Map<String, Object> getMemberMetrics(String userId) {
        Map<String, Object> data = new HashMap<>();

        Query taskQuery = new Query(Criteria.where("is_deleted").is(false).and("assigneesUserId").is(userId));
        taskQuery.fields().include("status", "priority", "dueDate", "title");
        List<TaskEntity> myTasks = mongoTemplate.find(taskQuery, TaskEntity.class);

        long totalAssigned = myTasks.size();
        long completed = myTasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.getStatus())).count();

        Map<String, Object> contribution = new HashMap<>();
        contribution.put("completed", completed);
        contribution.put("total", totalAssigned);
        data.put("my_contribution", contribution);

        List<Map<String, Object>> myFocus = myTasks.stream()
                .filter(t -> !"DONE".equalsIgnoreCase(t.getStatus()))
                .filter(t -> "HIGH".equalsIgnoreCase(String.valueOf(t.getPriority())) || "CRITICAL".equalsIgnoreCase(String.valueOf(t.getPriority())))
                .sorted((t1, t2) -> {
                    if (t1.getDueDate() == null && t2.getDueDate() == null) return 0;
                    if (t1.getDueDate() == null) return 1;
                    if (t2.getDueDate() == null) return -1;
                    return t1.getDueDate().compareTo(t2.getDueDate());
                })
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", t.getId());
                    map.put("title", t.getTitle());
                    map.put("priority", t.getPriority());

                    String dueDateStr = "Chưa rõ";
                    if (t.getDueDate() != null) {
                        long days = Duration.between(Instant.now(), t.getDueDate()).toDays();
                        if (days == 0) dueDateStr = "Hôm nay";
                        else if (days == 1) dueDateStr = "Ngày mai";
                        else if (days < 0) dueDateStr = "Quá hạn";
                        else dueDateStr = t.getDueDate().toString().substring(0, 10);
                    }
                    map.put("due_date", dueDateStr);
                    return map;
                })
                .limit(5)
                .collect(Collectors.toList());
        data.put("my_focus", myFocus);

        return data;
    }
}