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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.HttpClientErrorException;
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
        
        // 🚀 Cấu hình Timeout lên 3 phút để đợi AI suy nghĩ
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 5 giây kết nối
        factory.setReadTimeout(180000);   // 3 phút đọc dữ liệu (Quan trọng!)

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
        // 1. ALIAS MAPPING (ĐÁNH TRÁO ID CHỐNG ẢO GIÁC)
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
        // 2. PROMPT "KỶ LUẬT THÉP" (CÓ MODE VÀ DEADLINE)
        // ==========================================
        String systemInstruction = String.format("""
            Bạn là một Chuyên gia Quản trị Dự án (Master Project Manager) đa ngành hàng đầu thế giới.
            DANH SÁCH NHÂN SỰ BẮT BUỘC DÙNG (BÍ DANH):
            %s
            
            CHẾ ĐỘ KHỞI TẠO KIẾN TRÚC BẢNG: %s
            - NẾU LÀ 'SIMPLE': Trả về mảng suggested_columns gồm ["TO DO", "IN PROGRESS", "DONE"]. Gán tất cả task mới vào cột "TO DO".
            - NẾU LÀ 'ADVANCED': Tự động phân rã dự án thành 4-7 Giai đoạn (Phases). Ví dụ: ["Phase 1: Planning", "Phase 2: UI/UX", ...]. Gán task vào đúng tên cột giai đoạn của nó.
            
            QUY ĐỊNH VỀ THỜI GIAN VÀ DEADLINE:
            - Ngày khởi động dự án là: %s.
            - Dựa vào ngày này và 'story_point' (1 point = 1 ngày làm việc), hãy tính toán 'start_date' và 'due_date' (Định dạng YYYY-MM-DD) cho từng Task. Các task có thể làm song song hoặc nối tiếp tùy logic.
            
            LUẬT GÁN NHÂN SỰ (CRITICAL RULES):
            1. 'assignee_user_id' TUYỆT ĐỐI CHỈ ĐƯỢC CHỌN 1 TRONG CÁC BÍ DANH TỪ DANH SÁCH TRÊN. Nếu không có ai phù hợp hoặc CHƯA_CHỌN_NHÂN_SỰ, hãy để null.
            2. Phân bổ khối lượng công việc hợp lý theo kỹ năng.
            
            MẪU JSON TRẢ VỀ:
            {
              "suggested_columns": ["Cột 1", "Cột 2"],
              "tasks": [
                {
                  "title": "[Giai đoạn 1] - Tên task lớn",
                  "description": "Mô tả chi tiết",
                  "column_name": "Cột 1", 
                  "assignee_user_id": "MEMBER_1",
                  "story_point": 8,
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
            """, personnelContextBuilder.toString(), generationMode, startDate);

        // ==========================================
        // 3. VÒNG LẶP RETRY BẮT LỖI JSON
        // ==========================================
        int MAX_RETRIES = 3;
        AiTaskResponse finalResponse = null;
        String lastError = "";
        String finalCleanedJson = "";

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            log.info("▶️ Đang gọi AI (Lần thử {}/{})...", attempt, MAX_RETRIES);
            String promptToUse = attempt == 1 ? userPrompt : 
                userPrompt + "\n\n(LỖI JSON LẦN TRƯỚC: " + lastError + " -> HÃY KIỂM TRA LẠI VÀ CHỈ TRẢ VỀ JSON HỢP LỆ!)";

            String rawResponse = callGeminiWithHistory(systemInstruction, promptToUse, context.getMessages());

            try {
                String cleanedJson = rawResponse.replaceAll("(?s).*?```json\\s*|\\s*```.*", "").trim();
                if (!cleanedJson.startsWith("{")) cleanedJson = cleanedJson.substring(cleanedJson.indexOf("{"));
                
                finalResponse = objectMapper.readValue(cleanedJson, AiTaskResponse.class);
                if (finalResponse.tasks() == null || finalResponse.tasks().isEmpty()) throw new RuntimeException("List Task trống!");

                finalCleanedJson = cleanedJson;
                break; 
            } catch (Exception e) {
                lastError = e.getMessage();
                log.warn("❌ Lỗi Parse JSON ({}): {}", attempt, e.getMessage());
                if (attempt == MAX_RETRIES) throw new RuntimeException("Hệ thống AI lỗi định dạng: " + lastError);
            }
        }

        // ==========================================
        // 4. GIẢI MÃ, TẠO CỘT VÀ LƯU DATABASE
        // ==========================================
        if (finalResponse != null && finalResponse.tasks() != null) {
            
            // 4.1 TẠO CỘT (PHASES) TỰ ĐỘNG THEO AI
            Map<String, String> columnNameToIdMap = new HashMap<>();
            AtomicInteger colOrder = new AtomicInteger(0);
            
            if (finalResponse.suggestedColumns() != null) {
                for (String colName : finalResponse.suggestedColumns()) {
                    BoardColumnEntity newCol = new BoardColumnEntity();
                    newCol.setId(new ObjectId().toString());
                    newCol.setBoardId(boardId);
                    newCol.setName(colName);
                    newCol.setOrder(colOrder.getAndIncrement());
                    columnRepository.save(newCol);
                    columnNameToIdMap.put(colName, newCol.getId());
                }
            }

            // Fallback nếu AI ngáo không trả về cột
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

            AtomicInteger taskOrder = new AtomicInteger(0);
            List<TaskEntity> tasksToSave = new ArrayList<>();

            // 4.2 LƯU TASK CHA VÀ CON
            for (var dto : finalResponse.tasks()) {
                TaskEntity parentTask = new TaskEntity();
                String parentId = new ObjectId().toString(); 
                parentTask.setId(parentId);
                parentTask.setProjectId(projectId);
                
                // MAPPING CỘT TỪ AI
                String colId = columnNameToIdMap.getOrDefault(dto.columnName(), fallbackColumnId);
                parentTask.setColumnId(colId);
                
                String title = dto.title() != null ? dto.title() : (dto.name() != null ? dto.name() : "Untitled Task");
                parentTask.setTitle(title);
                parentTask.setDescription(dto.description());
                parentTask.setStoryPoint(dto.storyPoint());
                parentTask.setAiSuggestedPoint(dto.storyPoint());
                parentTask.setAiEstimatedReason(dto.aiEstimatedReason());
                
              
                if (dto.startDate() != null && !dto.startDate().isBlank()) {
                    try {
                        // Chuyển String "2026-05-15" -> LocalDate -> Instant (UTC)
                        java.time.Instant startInstant = java.time.LocalDate.parse(dto.startDate())
                                .atStartOfDay(java.time.ZoneOffset.UTC)
                                .toInstant();
                        parentTask.setStartDate(startInstant);
                    } catch (Exception e) {
                        log.warn("⚠️ Không thể parse startDate: {}", dto.startDate());
                    }
                }
                if (dto.dueDate() != null && !dto.dueDate().isBlank()) {
                    try {
                        java.time.Instant dueInstant = java.time.LocalDate.parse(dto.dueDate())
                                .atStartOfDay(java.time.ZoneOffset.UTC)
                                .toInstant();
                        parentTask.setDueDate(dueInstant);
                    } catch (Exception e) {
                        log.warn("⚠️ Không thể parse dueDate: {}", dto.dueDate());
                    }
                }
                
                if (dto.assigneeUserId() != null) {
                    String realId = aliasToRealId.get(dto.assigneeUserId());
                    if (realId != null) parentTask.setAssigneesUserId(List.of(realId));
                }
                
                try {
                    parentTask.setPriority(com.fluxboard.board.task.enums.TaskPriority.valueOf(dto.priority().toUpperCase()));
                } catch (Exception e) {
                    parentTask.setPriority(com.fluxboard.board.task.enums.TaskPriority.MEDIUM);
                }

                parentTask.setStatus("TODO");
                parentTask.setOrder(taskOrder.getAndIncrement());
                tasksToSave.add(parentTask);

                // TẠO SUBTASKS
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
                            if (realId != null) {
                                subTask.setAssigneesUserId(List.of(realId));
                            } else if (parentTask.getAssigneesUserId() != null) {
                                subTask.setAssigneesUserId(parentTask.getAssigneesUserId());
                            }
                        } else if (parentTask.getAssigneesUserId() != null) {
                            subTask.setAssigneesUserId(parentTask.getAssigneesUserId());
                        }

                        try {
                            subTask.setPriority(com.fluxboard.board.task.enums.TaskPriority.valueOf(subDto.priority().toUpperCase()));
                        } catch (Exception e) {
                            subTask.setPriority(parentTask.getPriority());
                        }
                        
                        tasksToSave.add(subTask);
                    }
                }
            }
            taskRepository.saveAll(tasksToSave);
        }

        // 6. LƯU LỊCH SỬ
        if (finalCleanedJson != null && !finalCleanedJson.isEmpty()) {
            AiContext.Message userMsg = new AiContext.Message();
            userMsg.setRole("user");
            userMsg.setContent(userPrompt);
            AiContext.Message modelMsg = new AiContext.Message();
            modelMsg.setRole("model");
            modelMsg.setContent(finalCleanedJson); 
            context.getMessages().add(userMsg);
            context.getMessages().add(modelMsg);
            aiContextRepo.save(context);
        }

        return finalResponse;
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
    log.info("🚀 Đang gửi request tới Gemini với Key: {}...", 
             (apiKey != null && apiKey.length() > 5) ? apiKey.substring(0, 5) + "****" : "TRỐNG!");

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
    // 🚨 ĐÂY: Lấy nội dung chi tiết mà Google "chửi" mình
    String errorBody = e.getResponseBodyAsString();
    log.error("❌ LỖI TỪ GOOGLE (Status: {}): {}", e.getStatusCode(), errorBody);
    throw new RuntimeException("Gemini API Error: " + errorBody);

} catch (Exception e) {
    // Lỗi kết nối, Timeout hoặc Parse JSON
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