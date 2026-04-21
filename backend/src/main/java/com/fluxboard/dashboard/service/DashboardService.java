package com.fluxboard.dashboard.service;

import com.fluxboard.activity.entity.ActivityEntity;
import com.fluxboard.activity.repository.ActivityRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.common.util.TextUtils;
import com.fluxboard.project.entity.ProjectEntity;
import com.fluxboard.project.repository.ProjectRepository;
import com.fluxboard.user.entity.User;
import com.fluxboard.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final ActivityRepository activityRepository;

    public DashboardService(UserRepository userRepository,
                            ProjectRepository projectRepository,
                            TaskRepository taskRepository,
                            ActivityRepository activityRepository) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.activityRepository = activityRepository;
    }

    // Helper: Lấy map User ID -> Full Name để tối ưu truy vấn
    private Map<String, String> getUserNameMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));
    }

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
    // 1. DATA CHO SYSTEM ADMIN
    // ==========================================
    private Map<String, Object> getSystemAdminMetrics() {
        Map<String, Object> data = new HashMap<>();
        Map<String, String> userNames = getUserNameMap();

        // 1.1 Cards
        Map<String, Object> cards = new HashMap<>();
        cards.put("total_users", userRepository.countByDeletedFalse());
        cards.put("active_projects", projectRepository.countByDeletedFalse());
        cards.put("total_departments", 5); 
        data.put("cards", cards);

        // 1.2 Project Status Distribution
        List<ProjectEntity> projects = projectRepository.findByDeletedFalse();
        Map<String, Long> statusCount = projects.stream()
                .filter(p -> p.getStatus() != null)
                .collect(Collectors.groupingBy(ProjectEntity::getStatus, Collectors.counting()));

        List<Map<String, Object>> projectDistribution = new ArrayList<>();
        statusCount.forEach((status, count) -> {
            Map<String, Object> stat = new HashMap<>();
            stat.put("status", status);
            stat.put("count", count);
            stat.put("color", status.equalsIgnoreCase("DONE") ? "#10b981" : "#f59e0b");
            projectDistribution.add(stat);
        });
        data.put("project_status_distribution", projectDistribution);

        // 1.3 Audit Logs
        List<ActivityEntity> recentActivities = activityRepository.findTop10ByOrderByCreatedAtDesc();
        List<Map<String, Object>> auditLogs = recentActivities.stream().map(act -> {
            Map<String, Object> log = new HashMap<>();
            log.put("id", act.getId());
            log.put("actor_name", userNames.getOrDefault(act.getUserId(), "System"));
            log.put("action", act.getAction());
            log.put("created_at", act.getCreatedAt());
            log.put("severity", "INFO");
            return log;
        }).collect(Collectors.toList());
        data.put("audit_logs", auditLogs);

        return data;
    }

    // ==========================================
    // 2. DATA CHO MANAGER 
    // ==========================================
    private Map<String, Object> getManagerMetrics() {
        Map<String, Object> data = new HashMap<>();
        List<TaskEntity> allTasks = taskRepository.findByDeletedFalse();

        // 2.1 AI vs Actual Points (Những task có đánh giá AI)
        List<Map<String, Object>> aiPoints = allTasks.stream()
                .filter(t -> t.getAiSuggestedPoint() != null && t.getStoryPoint() != null)
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("task_id", t.getTitle());
                    map.put("ai_point", t.getAiSuggestedPoint());
                    map.put("actual_point", t.getStoryPoint());
                    return map;
                })
                .limit(10) // Lấy 10 task tiêu biểu
                .collect(Collectors.toList());
        data.put("ai_vs_actual_points", aiPoints);

        // 2.2 Task Completion General
        long totalTasks = allTasks.size();
        long completedTasks = allTasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.getStatus())).count();
        double percentage = totalTasks == 0 ? 0 : Math.round(((double) completedTasks / totalTasks) * 100);
        
        List<Map<String, Object>> completionByTeam = new ArrayList<>();
        completionByTeam.add(Map.of("team", "Toàn hệ thống", "percentage", percentage));
        data.put("task_completion_by_team", completionByTeam);

        return data;
    }

    // ==========================================
    // 3. DATA CHO LEAD
    // ==========================================
    private Map<String, Object> getLeadMetrics() {
        Map<String, Object> data = new HashMap<>();
        List<TaskEntity> allTasks = taskRepository.findByDeletedFalse();
        Map<String, String> userNames = getUserNameMap();

        // 3.1 Team Workload (Tổng Story Point đang gánh)
        Map<String, Integer> workloadMap = new HashMap<>();
        for (TaskEntity task : allTasks) {
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
        List<Map<String, Object>> atRiskTasks = allTasks.stream()
                .filter(t -> !"DONE".equalsIgnoreCase(t.getStatus()) && t.getDueDate() != null && t.getDueDate().isBefore(now))
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", t.getId());
                    map.put("title", t.getTitle());
                    map.put("due_date", t.getDueDate());
                    map.put("priority", t.getPriority());
                    map.put("reason", "OVERDUE");
                    return map;
                })
                .collect(Collectors.toList());
        data.put("at_risk_tasks", atRiskTasks);

        return data;
    }

    // ==========================================
    // 4. DATA CHO MEMBER 
    // ==========================================
    private Map<String, Object> getMemberMetrics(String userId) {
        Map<String, Object> data = new HashMap<>();
        List<TaskEntity> myTasks = taskRepository.findByAssigneesUserIdContainingAndDeletedFalse(userId);

        long totalAssigned = myTasks.size();
        long completed = myTasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.getStatus())).count();

        Map<String, Object> contribution = new HashMap<>();
        contribution.put("completed", completed);
        contribution.put("total", totalAssigned);
        data.put("my_contribution", contribution);

        List<Map<String, Object>> myFocus = myTasks.stream()
                .filter(t -> !"DONE".equalsIgnoreCase(t.getStatus()))
                .filter(t -> "HIGH".equalsIgnoreCase(String.valueOf(t.getPriority())) || "CRITICAL".equalsIgnoreCase(String.valueOf(t.getPriority())))
                .map(t -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", t.getId());
                    map.put("title", t.getTitle());
                    map.put("priority", t.getPriority());
                    map.put("due_date", t.getDueDate());
                    return map;
                })
                .limit(5)
                .collect(Collectors.toList());
        data.put("my_focus", myFocus);

        return data;
    }
}