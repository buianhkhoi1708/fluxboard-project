package com.fluxboard.dashboard.repository;

import com.fluxboard.dashboard.dto.response.AdminMetricsResponse;
import com.fluxboard.dashboard.dto.response.ManagerMetricsResponse;
import com.fluxboard.dashboard.dto.response.MemberMetricsResponse;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ConditionalOperators;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class DashboardRepositoryImpl implements DashboardRepositoryCustom {
    private static final long DEFAULT_CAPACITY_POINTS = 20;
    private final MongoTemplate mongoTemplate;

    @Override
    public AdminMetricsResponse getAdminMetrics(String timeRange, String departmentId) {
        long totalUsers = mongoTemplate.count(activeQuery(), "users");
        long totalDepartments = mongoTemplate.count(activeQuery(), "departments");
        long totalTeams = mongoTemplate.count(activeQuery(), "teams");
        AdminMetricsResponse.OrganizationKpi kpi = new AdminMetricsResponse.OrganizationKpi(totalUsers, totalDepartments, totalTeams);

        Aggregation healthAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true)),
                Aggregation.group()
                        .sum(ConditionalOperators.when(Criteria.where("status").is("ON_TRACK")).then(1).otherwise(0)).as("onTrack")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("AT_RISK")).then(1).otherwise(0)).as("atRisk")
                        .sum(ConditionalOperators.when(Criteria.where("status").in("OVERDUE", "LATE")).then(1).otherwise(0)).as("overdue")
                        .sum("extension_count").as("totalExtensions")
        );
        Map healthDoc = mongoTemplate.aggregate(healthAgg, "task_deadlines", Map.class).getUniqueMappedResult();
        AdminMetricsResponse.CompanyDeadlineHealth health = new AdminMetricsResponse.CompanyDeadlineHealth(
                longVal(healthDoc, "onTrack"), longVal(healthDoc, "atRisk"),
                longVal(healthDoc, "overdue"), longVal(healthDoc, "totalExtensions")
        );

        Aggregation deptAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("story_point").ne(null)),
                Aggregation.unwind("assignees_user_id"),
                context -> new org.bson.Document("$addFields", new org.bson.Document("assignee_obj_id",
                        new org.bson.Document("$convert", new org.bson.Document("input", "$assignees_user_id").append("to", "objectId").append("onError", null).append("onNull", null)))),
                Aggregation.lookup("users", "assignee_obj_id", "_id", "user_info"),
                Aggregation.unwind("user_info", true),
                context -> new org.bson.Document("$addFields", new org.bson.Document("dept_obj_id",
                        new org.bson.Document("$convert", new org.bson.Document("input", "$user_info.department_id").append("to", "objectId").append("onError", null).append("onNull", null)))),
                Aggregation.lookup("departments", "dept_obj_id", "_id", "dept_info"),
                Aggregation.unwind("dept_info", true),
                Aggregation.group("$_id", "dept_info._id")
                        .first("story_point").as("storyPoint")
                        .first("status").as("status")
                        .first("dept_info._id").as("departmentId"),
                Aggregation.group("departmentId")
                        .sum("storyPoint").as("totalPoints")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("DONE")).thenValueOf("storyPoint").otherwise(0)).as("completedPoints")
        );
        AggregationResults<Map> deptResults = mongoTemplate.aggregate(deptAgg, "tasks", Map.class);
        List<AdminMetricsResponse.DepartmentPoint> deptPoints = deptResults.getMappedResults().stream()
                .map(doc -> new AdminMetricsResponse.DepartmentPoint(
                        doc.get("_id") == null ? "Unassigned" : doc.get("_id").toString(),
                        longVal(doc, "totalPoints"), longVal(doc, "completedPoints"), 0
                )).toList();

        return new AdminMetricsResponse(kpi, health, deptPoints);
    }

    @Override
    public ManagerMetricsResponse getManagerMetrics(String timeRange, String teamId) {
        Aggregation workloadAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("status").ne("DONE").and("story_point").ne(null)),
                Aggregation.unwind("assignees_user_id"),
                context -> new org.bson.Document("$addFields", new org.bson.Document("assignee_obj_id",
                        new org.bson.Document("$convert", new org.bson.Document("input", "$assignees_user_id").append("to", "objectId").append("onError", null).append("onNull", null)))),
                Aggregation.lookup("users", "assignee_obj_id", "_id", "user_details"),
                Aggregation.unwind("user_details", true),
                Aggregation.match(teamId != null && !teamId.isBlank() ? Criteria.where("user_details.team_id").is(teamId) : new Criteria()),
                Aggregation.group("assignees_user_id")
                        .first("user_details.full_name").as("fullName")
                        .sum("story_point").as("currentPoints")
        );
        List<ManagerMetricsResponse.TeamWorkload> teamWorkload = mongoTemplate.aggregate(workloadAgg, "tasks", Map.class)
                .getMappedResults().stream().map(doc -> {
                    long points = longVal(doc, "currentPoints");
                    double loadPercentage = DEFAULT_CAPACITY_POINTS <= 0 ? 0 : round(points * 100.0 / DEFAULT_CAPACITY_POINTS);
                    return new ManagerMetricsResponse.TeamWorkload(
                            str(doc.get("_id")), firstNonBlank(str(doc.get("fullName")), "Unknown"),
                            points, DEFAULT_CAPACITY_POINTS, loadPercentage,
                            points > DEFAULT_CAPACITY_POINTS ? "OVERLOADED" : "AVAILABLE"
                    );
                }).toList();

        Aggregation statusAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true)),
                Aggregation.group()
                        .sum(ConditionalOperators.when(Criteria.where("status").is("ON_TRACK")).then(1).otherwise(0)).as("onTrack")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("AT_RISK")).then(1).otherwise(0)).as("atRisk")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("OVERDUE")).then(1).otherwise(0)).as("overdue")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("LATE")).then(1).otherwise(0)).as("late")
        );
        Map statusDoc = mongoTemplate.aggregate(statusAgg, "task_deadlines", Map.class).getUniqueMappedResult();
        ManagerMetricsResponse.TeamDeadlineStatus teamDeadlineStatus = new ManagerMetricsResponse.TeamDeadlineStatus(
                longVal(statusDoc, "onTrack"), longVal(statusDoc, "atRisk"),
                longVal(statusDoc, "overdue"), longVal(statusDoc, "late")
        );

        Aggregation atRiskAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("status").in("AT_RISK", "OVERDUE", "LATE")),
                context -> new org.bson.Document("$addFields", new org.bson.Document("task_obj_id",
                        new org.bson.Document("$convert", new org.bson.Document("input", "$task_id").append("to", "objectId").append("onError", null).append("onNull", null)))),
                Aggregation.lookup("tasks", "task_obj_id", "_id", "task_info"),
                Aggregation.unwind("task_info", true),
                Aggregation.limit(10)
        );
        List<ManagerMetricsResponse.AtRiskTask> atRiskTasks = mongoTemplate.aggregate(atRiskAgg, "task_deadlines", Map.class)
                .getMappedResults().stream().map(doc -> {
                    Map taskInfo = (Map) doc.get("task_info");
                    String taskId = str(doc.get("task_id"));
                    return new ManagerMetricsResponse.AtRiskTask(
                            taskId,
                            taskInfo == null ? "Unknown" : firstNonBlank(str(taskInfo.get("title")), "Unknown"),
                            taskInfo == null ? 0 : intVal(taskInfo.get("story_point")),
                            taskInfo == null ? "NORMAL" : firstNonBlank(str(taskInfo.get("priority")), "NORMAL"),
                            instantVal(doc.get("due_date")),
                            firstNonBlank(str(doc.get("status")), "ON_TRACK"),
                            intVal(doc.get("extension_count")),
                            buildTaskUrl(taskInfo, taskId)
                    );
                }).toList();

        Aggregation aiAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("ai_suggested_point").ne(null).and("story_point").ne(null)),
                Aggregation.sort(Sort.Direction.DESC, "created_at"),
                Aggregation.limit(10)
        );
        List<ManagerMetricsResponse.AiEfficiency> aiEfficiency = mongoTemplate.aggregate(aiAgg, "tasks", Map.class)
                .getMappedResults().stream().map(doc -> {
                    double ai = doubleVal(doc.get("ai_suggested_point"));
                    double actual = doubleVal(doc.get("story_point"));
                    double deviation = ai > 0 ? ((actual - ai) / ai) * 100.0 : 0.0;
                    double accuracy = Math.max(0.0, 100.0 - Math.abs(deviation));
                    String status = Math.abs(deviation) <= 10 ? "ACCURATE" : deviation > 10 ? "UNDERESTIMATED" : "OVERESTIMATED";
                    return new ManagerMetricsResponse.AiEfficiency(
                            str(doc.get("_id")),
                            firstNonBlank(str(doc.get("title")), "Untitled Task"),
                            round(ai), round(actual), round(actual), round(actual - ai),
                            round(deviation), round(accuracy), status, aiComment(status, deviation)
                    );
                }).toList();

        return new ManagerMetricsResponse(teamWorkload, teamDeadlineStatus, atRiskTasks, aiEfficiency);
    }

    @Override
    public MemberMetricsResponse getMemberMetrics(String userId) {
        Aggregation contribAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("assignees_user_id").is(userId)),
                Aggregation.group()
                        .count().as("totalAssigned")
                        .sum(ConditionalOperators.when(Criteria.where("status").is("DONE")).then(1).otherwise(0)).as("completedTasks")
        );
        Map contribDoc = mongoTemplate.aggregate(contribAgg, "tasks", Map.class).getUniqueMappedResult();
        MemberMetricsResponse.MyContribution contribution = new MemberMetricsResponse.MyContribution(
                longVal(contribDoc, "completedTasks"), longVal(contribDoc, "totalAssigned")
        );

        Aggregation focusAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("is_deleted").ne(true).and("assignees_user_id").is(userId).and("status").ne("DONE").and("priority").in("HIGH", "CRITICAL")),
                context -> new org.bson.Document("$lookup", new org.bson.Document("from", "task_deadlines")
                        .append("let", new org.bson.Document("taskIdStr", new org.bson.Document("$toString", "$_id")))
                        .append("pipeline", List.of(new org.bson.Document("$match", new org.bson.Document("$expr", new org.bson.Document("$eq", List.of("$task_id", "$$taskIdStr"))))))
                        .append("as", "deadline_info")),
                Aggregation.unwind("deadline_info", true),
                Aggregation.sort(Sort.Direction.ASC, "deadline_info.due_date"),
                Aggregation.limit(5)
        );
        List<MemberMetricsResponse.FocusTask> focusTasks = mongoTemplate.aggregate(focusAgg, "tasks", Map.class)
                .getMappedResults().stream().map(doc -> {
                    Map deadlineInfo = (Map) doc.get("deadline_info");
                    return new MemberMetricsResponse.FocusTask(
                            str(doc.get("_id")),
                            firstNonBlank(str(doc.get("title")), "Untitled Task"),
                            firstNonBlank(str(doc.get("priority")), "NORMAL"),
                            intVal(doc.get("story_point")),
                            deadlineInfo == null ? null : instantVal(deadlineInfo.get("due_date")),
                            deadlineInfo == null ? "ON_TRACK" : firstNonBlank(str(deadlineInfo.get("status")), "ON_TRACK"),
                            deadlineInfo == null ? 0 : intVal(deadlineInfo.get("extension_count"))
                    );
                }).toList();

        return new MemberMetricsResponse(contribution, focusTasks);
    }

    private Query activeQuery() {
        return new Query(Criteria.where("is_deleted").ne(true));
    }

    private String buildTaskUrl(Map task, String fallbackTaskId) {
        if (task == null) return null;
        Object boardId = task.get("board_id");
        if (boardId == null && task.get("column_id") != null) {
            Object columnId = task.get("column_id");
            Object queryId = columnId instanceof String s && ObjectId.isValid(s) ? new ObjectId(s) : columnId;
            Map col = mongoTemplate.findOne(new Query(Criteria.where("_id").is(queryId)), Map.class, "board_column");
            if (col != null) boardId = col.get("board_id");
        }
        String taskId = str(task.get("_id"));
        if (taskId == null) taskId = fallbackTaskId;
        return boardId == null || taskId == null ? null : "/board/" + boardId + "?taskId=" + taskId;
    }

    private String aiComment(String status, double deviation) {
        if ("ACCURATE".equals(status)) return "AI ước lượng sát với story point thực tế của team.";
        if ("UNDERESTIMATED".equals(status)) return "AI ước lượng thấp hơn thực tế, task tốn thêm " + round(Math.abs(deviation)) + "% nỗ lực.";
        return "AI ước lượng cao hơn thực tế, team làm ít hơn " + round(Math.abs(deviation)) + "% so với dự đoán.";
    }

    private long longVal(Map doc, String key) {
        return doc == null ? 0L : longVal(doc.get(key));
    }

    private long longVal(Object v) {
        return v instanceof Number n ? n.longValue() : 0L;
    }

    private int intVal(Object v) {
        return v instanceof Number n ? n.intValue() : 0;
    }

    private double doubleVal(Object v) {
        return v instanceof Number n ? n.doubleValue() : 0.0;
    }

    private double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private Instant instantVal(Object v) {
        if (v instanceof Instant i) return i;
        if (v instanceof java.util.Date d) return d.toInstant();
        return null;
    }
}