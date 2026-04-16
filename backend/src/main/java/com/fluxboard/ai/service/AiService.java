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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

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
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
        this.userService = userService;
        this.aiContextRepo = aiContextRepo;
        this.taskRepository = taskRepository;
        this.columnRepository = columnRepository;
    }

    public AiTaskResponse generateSmartTasks(String boardId, String projectId, String userPrompt, List<String> memberIds) {
        
        // ==========================================
        // 1. ALIAS MAPPING (ĐÁNH TRÁO ID CHỐNG ẢO GIÁC)
        // ==========================================
        Map<String, String> aliasToRealId = new HashMap<>();
        StringBuilder personnelContextBuilder = new StringBuilder();
        
        List<String> allPersonnel = userService.getAiPersonnelContextByProject(projectId);
        
        if (memberIds != null && !memberIds.isEmpty()) {
            int index = 1;
            for (String realId : memberIds) {
                String alias = "MEMBER_" + index++; // Tạo bí danh: MEMBER_1, MEMBER_2...
                aliasToRealId.put(alias, realId);
                
                // Lấy thông tin (Tên, Role) từ DB
                String userInfo = allPersonnel.stream()
                    .filter(p -> p.contains(realId))
                    .findFirst()
                    .orElse("ID: " + realId + " - Vai trò: Kỹ sư phần mềm");
                    
                // Giấu ID thật, thay bằng Bí danh để mớm cho AI
                personnelContextBuilder.append("- ").append(userInfo.replace(realId, alias)).append("\n");
            }
        } else {
            personnelContextBuilder.append("CHƯA_CHỌN_NHÂN_SỰ");
        }
        
        String personnelContext = personnelContextBuilder.toString();

        // 2. LẤY CONTEXT HỘI THOẠI CŨ
        AiContext context = aiContextRepo.findByBoardIdAndDeletedFalse(boardId)
                .orElseGet(() -> {
                    AiContext newCtx = new AiContext();
                    newCtx.setBoardId(boardId);
                    newCtx.setMessages(new ArrayList<>());
                    return newCtx;
                });

        // 3. PROMPT "KỶ LUẬT THÉP" 
        String systemInstruction = String.format("""
            Bạn là một Chuyên gia Quản trị Dự án (Master Project Manager) đa ngành hàng đầu thế giới.
            DANH SÁCH MÃ NHÂN SỰ BẮT BUỘC (CHỈ DÙNG MÃ BẮT ĐẦU BẰNG 'MEMBER_'):
            %s
            
            NHIỆM VỤ: Đọc mô tả dự án của người dùng, TỰ ĐỘNG NHẬN DIỆN ngành nghề, sau đó phân rã thành các Task lớn và Subtask theo đúng quy trình chuẩn mực của ngành đó.
            
            QUY TRÌNH TƯ DUY ĐỘNG (DYNAMIC FRAMEWORK) - BẮT BUỘC PHẢI TUÂN THỦ:
            1. PHÂN TÍCH: Phân tích mô tả để xác định lĩnh vực dự án (VD: Phần mềm, Marketing, Xây dựng, Sự kiện, Hành chính, v.v.).
            2. TẠO KHUNG CHUẨN: Tự động thiết lập một quy trình làm việc chuẩn gồm 5 đến 8 giai đoạn (Phases) logic liên tiếp nhau cho riêng lĩnh vực đó.
            3. TẠO TASK LỚN: Ứng với MỖI giai đoạn vừa lập, hãy tạo ra ít nhất 1 Task lớn. (Tổng cộng phải có từ 5 đến 8 Task lớn).
            4. TẠO SUBTASK: Phân rã mỗi Task lớn thành 3 đến 6 Subtasks hành động cực kỳ chi tiết.
            
            LUẬT GÁN NHÂN SỰ (CRITICAL RULES):
            1. 'assignee_user_id' TUYỆT ĐỐI CHỈ ĐƯỢC CHỌN 1 TRONG CÁC BÍ DANH TỪ DANH SÁCH TRÊN (MEMBER_1, MEMBER_2...).
            2. KHÔNG ĐƯỢC tự bịa ra ID nào khác. Nếu danh sách là CHƯA_CHỌN_NHÂN_SỰ, hãy để null.
            3. BẮT BUỘC phân bổ khối lượng công việc ĐỀU cho TẤT CẢ các MEMBER. 
            4. AI tự suy luận và phân vai trò một cách logic (VD: Gán MEMBER_1 làm các task planning, MEMBER_2 làm thực thi, MEMBER_3 làm kiểm tra).
            
            MẪU JSON:
            {
              "tasks": [
                {
                  "title": "[Giai đoạn 1] - Tên task lớn",
                  "description": "Mô tả chi tiết kỹ thuật/nghiệp vụ và mục tiêu của bước này",
                  "assignee_user_id": "MEMBER_1",
                  "story_point": 8,
                  "ai_estimation_reason": "Lý do ước tính độ khó",
                  "priority": "HIGH",
                  "subtasks": [
                    {
                      "subtask_id": "SUB-1",
                      "name": "Tên việc con hành động cụ thể",
                      "description": "Hướng dẫn thực thi chi tiết",
                      "assignee_user_id": "MEMBER_2",
                      "priority": "HIGH"
                    }
                  ]
                }
              ]
            }
            """, personnelContext);

        // 4. VÒNG LẶP RETRY
        int MAX_RETRIES = 3;
        AiTaskResponse finalResponse = null;
        String lastError = "";
        String finalCleanedJson = "";

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            log.info("▶️ Đang gọi AI (Lần thử {}/{})...", attempt, MAX_RETRIES);
            
            String promptToUse = attempt == 1 ? userPrompt : 
                userPrompt + "\n\n(LỖI JSON LẦN TRƯỚC: " + lastError + " -> HÃY KIỂM TRA LẠI CẤU TRÚC JSON!)";

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
                if (attempt == MAX_RETRIES) throw new RuntimeException("Hệ thống AI không thể xử lý định dạng. Lỗi: " + lastError);
                try { Thread.sleep(1000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }

        // ==========================================
        // 5. GIẢI MÃ ALIAS & LƯU DATABASE
        // ==========================================
        if (finalResponse != null && finalResponse.tasks() != null) {
            String targetColumnId = columnRepository.findByBoardIdAndDeletedFalseOrderByOrderAsc(boardId)
                    .stream().findFirst().map(BoardColumnEntity::getId).orElse(null);
                    
            AtomicInteger currentOrder = new AtomicInteger(0);
            List<TaskEntity> tasksToSave = new ArrayList<>();

            for (var dto : finalResponse.tasks()) {
                // TẠO TASK CHA
                TaskEntity parentTask = new TaskEntity();
                String parentId = new ObjectId().toString(); 
                parentTask.setId(parentId);
                parentTask.setColumnId(targetColumnId);
                
                String title = dto.title() != null ? dto.title() : (dto.name() != null ? dto.name() : "Untitled Task");
                parentTask.setTitle(title);
                parentTask.setDescription(dto.description());
                parentTask.setStoryPoint(dto.storyPoint());
                parentTask.setAiSuggestedPoint(dto.storyPoint());
                parentTask.setAiEstimatedReason(dto.aiEstimatedReason());
                
                // 🚀 GIẢI MÃ ID CHO TASK CHA
                if (dto.assigneeUserId() != null) {
                    String realId = aliasToRealId.get(dto.assigneeUserId()); // Dịch MEMBER_1 thành 69da...
                    if (realId != null) parentTask.setAssigneesUserId(List.of(realId));
                }
                
                try {
                    parentTask.setPriority(com.fluxboard.board.task.enums.TaskPriority.valueOf(dto.priority().toUpperCase()));
                } catch (Exception e) {
                    parentTask.setPriority(com.fluxboard.board.task.enums.TaskPriority.MEDIUM);
                }

                parentTask.setStatus("TODO");
                parentTask.setOrder(currentOrder.getAndIncrement());
                tasksToSave.add(parentTask);

                // TẠO SUBTASKS 
                if (dto.subtasks() != null && !dto.subtasks().isEmpty()) {
                    for (var subDto : dto.subtasks()) {
                        TaskEntity subTask = new TaskEntity();
                        subTask.setId(new ObjectId().toString());
                        subTask.setParentTaskId(parentId); 
                        subTask.setColumnId(targetColumnId);
                        
                        String stTitle = subDto.title() != null ? subDto.title() : (subDto.name() != null ? subDto.name() : "Untitled Subtask");
                        subTask.setTitle(stTitle);
                        subTask.setDescription(subDto.description());
                        subTask.setStatus("TODO");
                        subTask.setOrder(currentOrder.getAndIncrement());
                        
                        // 🚀 GIẢI MÃ ID CHO SUBTASK
                        if(subDto.assigneeUserId() != null) {
                            String realId = aliasToRealId.get(subDto.assigneeUserId());
                            if (realId != null) {
                                subTask.setAssigneesUserId(List.of(realId));
                            } else if (parentTask.getAssigneesUserId() != null) {
                                subTask.setAssigneesUserId(parentTask.getAssigneesUserId()); // Rơi vào fallback cha
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
            String response = restClient.post()
                    .uri(GEMINI_URL + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi kết nối API Gemini.");
        }
    }

    // ==========================================
    // THÊM MỚI: AI DEVIATION INSIGHTS 
    // ==========================================
    public List<AiInsightResponse> getDeviationInsights(String projectId) {
        // Truy vấn các task đã hoàn thành và có đánh giá từ AI ban đầu
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
            
            // Biên độ dung sai được chấp nhận là +-10%
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

            // Làm tròn 2 chữ số thập phân
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