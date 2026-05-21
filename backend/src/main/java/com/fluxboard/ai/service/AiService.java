package com.fluxboard.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluxboard.ai.dto.AiTaskResponse;
import com.fluxboard.ai.dto.response.AiInsightResponse;
import com.fluxboard.ai.entity.AiContext;
import com.fluxboard.ai.repository.AiContextRepository;
import com.fluxboard.board.column.entity.BoardColumnEntity;
import com.fluxboard.board.column.repository.BoardColumnRepository;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import com.fluxboard.user.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final AiContextRepository aiContextRepo;
    private final TaskRepository taskRepository;
    private final BoardColumnRepository columnRepository;

    @Value("${GEMINI_API_KEY}")
    private String apiKey;

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public AiService(ObjectMapper objectMapper, UserService userService, 
                     AiContextRepository aiContextRepo, TaskRepository taskRepository,
                     BoardColumnRepository columnRepository) {
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  
        factory.setReadTimeout(180000);   

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
                
        this.objectMapper = objectMapper;
        this.userService = userService;
        this.aiContextRepo = aiContextRepo;
        this.taskRepository = taskRepository;
        this.columnRepository = columnRepository;
    }

    public AiTaskResponse generateSmartTasks(String boardId, String projectId, String userPrompt, List<String> memberIds, String generationMode, String startDate) {
        
        // ==========================================
        // 0. ĐỌC HIỆN TRẠNG BOARD (ĐỂ NHÉT VÀO NÃO AI)
        // Đây là điểm then chốt giúp AI "phát triển tiếp" thay vì tạo mới hoàn toàn
        // ==========================================
        List<BoardColumnEntity> existingColumns = columnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId);
        List<String> existingColIds = existingColumns.stream().map(BoardColumnEntity::getId).toList();
        List<TaskEntity> existingTasks = existingColIds.isEmpty() ? List.of() : taskRepository.findByColumnIdInAndDeletedFalse(existingColIds);

        String currentColsStr = existingColumns.isEmpty() ? "Chưa có cột nào" : 
                existingColumns.stream().map(BoardColumnEntity::getName).collect(Collectors.joining(", "));
        String currentTasksStr = existingTasks.isEmpty() ? "Chưa có task nào" : 
                existingTasks.stream().map(TaskEntity::getTitle).collect(Collectors.joining(" | "));

        // ==========================================
        // 1. ALIAS MAPPING (CHỐNG ẢO GIÁC ID)
        // ==========================================
        Map<String, String> aliasToRealId = new HashMap<>();
        StringBuilder personnelContextBuilder = new StringBuilder();
        
        List<String> allPersonnel = userService.getAiPersonnelContextByProject(projectId);
        
        if (memberIds != null && !memberIds.isEmpty()) {
            int index = 1;
            for (String realId : memberIds) {
                String alias = "MEMBER_" + index++;
                aliasToRealId.put(alias, realId);
                String userInfo = allPersonnel.stream()
                    .filter(p -> p.contains(realId))
                    .findFirst()
                    .orElse("ID: " + realId + " - Vai trò: Kỹ sư/Thực thi");
                personnelContextBuilder.append("- ").append(userInfo.replace(realId, alias)).append("\n");
            }
        } else {
            personnelContextBuilder.append("CHƯA_CHỌN_NHÂN_SỰ");
        }

        AiContext context = aiContextRepo.findByBoardIdAndDeletedFalse(boardId)
                .orElseGet(() -> {
                    AiContext newCtx = new AiContext();
                    newCtx.setBoardId(boardId);
                    newCtx.setMessages(new ArrayList<>());
                    return newCtx;
                });

        // ==========================================
        // 2. PROMPT TIẾN HÓA: CÓ NGỮ CẢNH HIỆN TẠI
        // ==========================================
        String modeInstruction = "SIMPLE".equalsIgnoreCase(generationMode) 
            ? "MÔ HÌNH: KANBAN ĐƠN GIẢN. Cố gắng sử dụng lại các cột đã có. Nếu chưa có cột nào, hãy đề xuất 3 cột: [\"TO DO\", \"IN PROGRESS\", \"DONE\"]."
            : "MÔ HÌNH: ĐA GIAI ĐOẠN (MULTI-PHASE). Bạn có thể tái sử dụng cột cũ hoặc đề xuất thêm cột Giai đoạn mới nếu cần thiết.";

        String systemInstruction = String.format("""
            Bạn là một Chuyên gia Quản trị Dự án (Master Project Manager).
            
            HIỆN TRẠNG DỰ ÁN ĐANG CÓ (RẤT QUAN TRỌNG):
            - Các cột hiện tại: %s
            - Các task ĐÃ TỒN TẠI: %s
            => NHIỆM VỤ CỦA BẠN: Dựa vào yêu cầu mới của người dùng, HÃY ĐỀ XUẤT THÊM CÁC TASK MỚI (TUYỆT ĐỐI KHÔNG TẠO LẠI CÁC TASK ĐÃ TỒN TẠI BÊN TRÊN).
            
            DANH SÁCH NHÂN SỰ ĐỂ GÁN (BÍ DANH):
            %s
            
            CHẾ ĐỘ SINH TASK:
            %s
            
            QUY ĐỊNH THỜI GIAN:
            - Ngày bắt đầu cho đợt task mới này: %s (Định dạng YYYY-MM-DD).
            
            QUY ĐỊNH NGHIÊM NGẶT:
            1. 'assignee_user_id': TUYỆT ĐỐI CHỈ ĐƯỢC CHỌN TỪ DANH SÁCH BÍ DANH Ở TRÊN (Ví dụ: MEMBER_1).
            2. Trả về DUY NHẤT JSON, không kèm văn bản giải thích.
            
            MẪU JSON TRẢ VỀ:
            {
              "suggested_columns": ["Tên cột 1", "Tên cột 2"],
              "tasks": [
                {
                  "title": "Tên task mới",
                  "description": "Mô tả",
                  "column_name": "Tên cột 1", 
                  "assignee_user_id": "MEMBER_1",
                  "story_point": 5,
                  "ai_estimation_reason": "Lý do",
                  "priority": "HIGH",
                  "start_date": "2026-05-15",
                  "due_date": "2026-05-20",
                  "subtasks": [
                    {
                      "subtask_id": "SUB-1",
                      "name": "Tên việc con",
                      "description": "Chi tiết",
                      "assignee_user_id": "MEMBER_2",
                      "priority": "HIGH"
                    }
                  ]
                }
              ]
            }
            """, currentColsStr, currentTasksStr, personnelContextBuilder.toString(), modeInstruction, startDate);

        // ==========================================
        // 3. VÒNG LẶP RETRY BẮT LỖI JSON
        // ==========================================
        int MAX_RETRIES = 3;
        AiTaskResponse finalResponse = null;
        String finalCleanedJson = "";
        String lastError = "";

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            log.info("▶️ Đang gọi AI (Lần thử {}/{})...", attempt, MAX_RETRIES);
            String promptToUse = attempt == 1 ? userPrompt : 
                userPrompt + "\n\n(LỖI JSON LẦN TRƯỚC: " + lastError + " -> CHỈ TRẢ VỀ JSON HỢP LỆ!)";

            String rawResponse = callGeminiWithHistory(systemInstruction, promptToUse, context.getMessages());

            try {
                String cleanedJson = rawResponse.replaceAll("(?s).*?```json\\s*|\\s*```.*", "").trim();
                if (!cleanedJson.startsWith("{")) cleanedJson = cleanedJson.substring(cleanedJson.indexOf("{"));
                
                finalResponse = objectMapper.readValue(cleanedJson, AiTaskResponse.class);
                if (finalResponse.tasks() == null || finalResponse.tasks().isEmpty()) {
                     throw new RuntimeException("List Task trống!");
                }
                finalCleanedJson = cleanedJson;
                break; 
            } catch (Exception e) {
                lastError = e.getMessage();
                log.warn("❌ Lỗi Parse JSON ({}): {}", attempt, e.getMessage());
                if (attempt == MAX_RETRIES) throw new RuntimeException("Hệ thống AI lỗi định dạng: " + lastError);
            }
        }

        // ==========================================
        // 4. LƯU DATABASE (CỘT & TASK - CÓ CƠ CHẾ GỘP/MERGE)
        // ==========================================
        if (finalResponse != null && finalResponse.tasks() != null) {
            
            Map<String, String> columnNameToIdMap = new HashMap<>();
            int maxOrder = 0;
            
            // 4.1 Đưa các cột ĐÃ CÓ vào Map để tái sử dụng
            for (BoardColumnEntity col : existingColumns) {
                columnNameToIdMap.put(col.getName().trim().toLowerCase(), col.getId());
                if (col.getOrder() > maxOrder) maxOrder = col.getOrder();
            }
            
            AtomicInteger colOrder = new AtomicInteger(maxOrder + 1);
            
            // 4.2 Xử lý các cột AI đề xuất (Chỉ tạo mới nếu chưa tồn tại)
            if (finalResponse.suggestedColumns() != null) {
                for (String colName : finalResponse.suggestedColumns()) {
                    String colKey = colName.trim().toLowerCase();
                    if (!columnNameToIdMap.containsKey(colKey)) {
                        BoardColumnEntity newCol = new BoardColumnEntity();
                        newCol.setId(new ObjectId().toString());
                        newCol.setBoardId(boardId);
                        newCol.setName(colName);
                        newCol.setOrder(colOrder.getAndIncrement());
                        columnRepository.save(newCol);
                        columnNameToIdMap.put(colKey, newCol.getId());
                    }
                }
            }

            // Fallback cột TO DO nếu trống không
            String fallbackColumnId = columnNameToIdMap.values().stream().findFirst()
                    .orElseGet(() -> {
                        BoardColumnEntity fb = new BoardColumnEntity();
                        fb.setId(new ObjectId().toString());
                        fb.setBoardId(boardId);
                        fb.setName("TO DO");
                        fb.setOrder(0);
                        columnRepository.save(fb);
                        return fb.getId();
                    });

            AtomicInteger taskOrder = new AtomicInteger(existingTasks.size()); // Đẩy task mới xuống cuối
            List<TaskEntity> tasksToSave = new ArrayList<>();

            // 4.3 Lưu Task Mới
            for (var dto : finalResponse.tasks()) {
                TaskEntity parentTask = new TaskEntity();
                String parentId = new ObjectId().toString(); 
                parentTask.setId(parentId);
                parentTask.setProjectId(projectId);
                
                String expectedColName = dto.columnName() != null ? dto.columnName().trim().toLowerCase() : "";
                String colId = columnNameToIdMap.getOrDefault(expectedColName, fallbackColumnId);
                parentTask.setColumnId(colId);
                
                String title = dto.title() != null ? dto.title() : (dto.name() != null ? dto.name() : "Untitled Task");
                parentTask.setTitle(title);
                parentTask.setDescription(dto.description());
                parentTask.setStoryPoint(dto.storyPoint());
                parentTask.setAiSuggestedPoint(dto.storyPoint());
                parentTask.setAiEstimatedReason(dto.aiEstimatedReason());
                
                parentTask.setStartDate(parseIsoDate(dto.startDate()));
                parentTask.setDueDate(parseIsoDate(dto.dueDate()));
                
                if (dto.assigneeUserId() != null) {
                    String realId = aliasToRealId.get(dto.assigneeUserId());
                    if (realId != null) parentTask.setAssigneesUserId(List.of(realId));
                }
                
                parentTask.setPriority(parsePriority(dto.priority()));
                parentTask.setStatus("TODO");
                parentTask.setOrder(taskOrder.getAndIncrement());
                tasksToSave.add(parentTask);

                if (dto.subtasks() != null && !dto.subtasks().isEmpty()) {
                    for (var subDto : dto.subtasks()) {
                        TaskEntity subTask = new TaskEntity();
                        subTask.setId(new ObjectId().toString());
                        subTask.setParentTaskId(parentId); 
                        subTask.setColumnId(colId); 
                        subTask.setProjectId(projectId);
                        
                        String stTitle = subDto.title() != null ? subDto.title() : (subDto.name() != null ? subDto.name() : "Untitled Subtask");
                        subTask.setTitle(stTitle);
                        subTask.setDescription(subDto.description());
                        subTask.setStatus("TODO");
                        subTask.setOrder(taskOrder.getAndIncrement());
                        
                        if(subDto.assigneeUserId() != null) {
                            String realId = aliasToRealId.get(subDto.assigneeUserId());
                            subTask.setAssigneesUserId(realId != null ? List.of(realId) : parentTask.getAssigneesUserId());
                        } else {
                            subTask.setAssigneesUserId(parentTask.getAssigneesUserId());
                        }

                        subTask.setPriority(parsePriority(subDto.priority()));
                        tasksToSave.add(subTask);
                    }
                }
            }
            taskRepository.saveAll(tasksToSave);
        }

        // 5. LƯU LỊCH SỬ CHAT
        if (finalCleanedJson != null && !finalCleanedJson.isEmpty()) {
            AiContext.Message userMsg = new AiContext.Message();
            userMsg.setRole("user");
            userMsg.setContent("Phát triển tiếp bảng với Mode: " + generationMode + " - Yêu cầu: " + userPrompt);
            AiContext.Message modelMsg = new AiContext.Message();
            modelMsg.setRole("model");
            modelMsg.setContent(finalCleanedJson); 
            context.getMessages().add(userMsg);
            context.getMessages().add(modelMsg);
            aiContextRepo.save(context);
        }

        return finalResponse;
    }

    private Instant parseIsoDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            return LocalDate.parse(dateStr).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException e) {
            log.warn("⚠️ Không thể parse Date: {}", dateStr);
            return null;
        }
    }

    private com.fluxboard.board.task.enums.TaskPriority parsePriority(String priorityStr) {
        if (priorityStr == null || priorityStr.isBlank()) return com.fluxboard.board.task.enums.TaskPriority.MEDIUM;
        try {
            return com.fluxboard.board.task.enums.TaskPriority.valueOf(priorityStr.toUpperCase());
        } catch (Exception e) {
            return com.fluxboard.board.task.enums.TaskPriority.MEDIUM;
        }
    }

    private String callGeminiWithHistory(String systemInstruction, String userPrompt, List<AiContext.Message> history) {
        List<Map<String, Object>> contents = new ArrayList<>();
        if (history != null) {
            for (AiContext.Message msg : history) {
                contents.add(Map.of("role", msg.getRole(), "parts", List.of(Map.of("text", msg.getContent()))));
            }
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt))));

        Map<String, Object> body = new HashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of(
            "responseMimeType", "application/json",
            "temperature", 0.1 
        ));
        
        try {
            log.info("🚀 Đang gửi request tới Gemini...");
            String response = restClient.post()
                    .uri(GEMINI_URL + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            log.info("✅ Gemini đã trả lời thành công!");
            JsonNode root = objectMapper.readTree(response);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();

        } catch (HttpClientErrorException e) {
            String errorBody = e.getResponseBodyAsString();
            log.error("❌ LỖI TỪ GOOGLE (Status: {}): {}", e.getStatusCode(), errorBody);
            throw new RuntimeException("Gemini API Error: " + errorBody);
        } catch (Exception e) {
            log.error("🚨 SỰ CỐ HỆ THỐNG: ", e);
            throw new RuntimeException("Hệ thống AI gặp sự cố: " + e.getMessage());
        }
    }

    // ==========================================
    // AI DEVIATION INSIGHTS
    // ==========================================
    public List<AiInsightResponse> getDeviationInsights(String projectId) {
        List<TaskEntity> completedTasks = taskRepository
                .findByProjectIdAndStatusAndAiSuggestedPointIsNotNull(projectId, "DONE");

        return completedTasks.stream().map(task -> {
            double suggested = task.getAiSuggestedPoint() != null ? task.getAiSuggestedPoint() : 0.0;
            double actual = task.getStoryPoint() != null ? task.getStoryPoint() : 0.0;
            
            double deviationPercent = 0.0;
            if (suggested > 0) {
                deviationPercent = ((actual - suggested) / suggested) * 100.0;
            }

            String status;
            String comment;
            
            if (Math.abs(deviationPercent) <= 10.0) {
                status = "ACCURATE";
                comment = "AI ước lượng khá sát với thực tế triển khai của team.";
            } else if (deviationPercent > 10.0) {
                status = "UNDERESTIMATED";
                comment = String.format("AI ước lượng thấp hơn thực tế. Task phức tạp hơn dự kiến, tốn thêm %.1f%% nỗ lực.", deviationPercent);
            } else {
                status = "OVERESTIMATED";
                comment = String.format("AI ước lượng cao hơn thực tế. Team hoàn thành nhanh hơn dự kiến %.1f%%.", Math.abs(deviationPercent));
            }

            double roundedDeviation = Math.round(deviationPercent * 100.0) / 100.0;

            return new AiInsightResponse(
                    task.getId(),
                    task.getTitle(),
                    suggested,
                    actual,
                    roundedDeviation,
                    status,
                    comment
            );
        }).collect(Collectors.toList());
    }
}