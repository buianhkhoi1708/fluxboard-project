package com.fluxboard.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fluxboard.ai.dto.AiTaskResponse;
import com.fluxboard.ai.entity.AiContext;
import com.fluxboard.ai.repository.AiContextRepository;
import com.fluxboard.user.service.UserService;
import lombok.extern.slf4j.Slf4j; // Thêm import này
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;

@Slf4j // Phải có cái này thì mới dùng log.error() được
@Service
public class AiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final AiContextRepository aiContextRepo;

    @Value("${GEMINI_API_KEY}")
    private String apiKey;

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    public AiService(ObjectMapper objectMapper, UserService userService, AiContextRepository aiContextRepo) {
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
        this.userService = userService;
        this.aiContextRepo = aiContextRepo;
    }

    public AiTaskResponse generateSmartTasks(String boardId, String projectId, String userPrompt) {
        List<String> personnel = userService.getAiPersonnelContextByProject(projectId);
        String personnelContext = String.join("\n", personnel);

        AiContext context = aiContextRepo.findByBoardIdAndDeletedFalse(boardId)
                .orElseGet(() -> {
                    AiContext newCtx = new AiContext();
                    newCtx.setBoardId(boardId);
                    return newCtx;
                });

        // Nâng cấp Instruction: Ép Gemini trả về JSON theo đúng key "tasks" của record
        String systemInstruction = String.format("""
            Bạn là Scrum Master của dự án Fluxboard.
            DỮ LIỆU NHÂN SỰ CÓ SẴN (Sử dụng ID này để gán việc):
            %s
            
            NHIỆM VỤ: Phân rã yêu cầu của người dùng thành danh sách Task.
            LUẬT CHƠI:
            1. Gán việc (assignee_user_id) dựa trên chuyên môn của Team.
            2. Story Point dùng dãy Fibonacci (1, 2, 3, 5, 8, 13).
            3. TRẢ VỀ DUY NHẤT 1 JSON OBJECT có key ngoài cùng là "tasks".
            VÍ DỤ: {"tasks": [{"title": "Tên task", "description": "Mô tả", "assignee_user_id": "ID", "story_point": 5, "ai_estimation_reason": "Lý do", "priority": "HIGH"}]}
            """, personnelContext);

        String rawResponse = callGeminiWithHistory(systemInstruction, userPrompt, context.getMessages());
        
        try {
            // Xử lý Markdown thừa nếu AI trả về ```json ... ```
            String cleanedJson = rawResponse.replaceAll("(?s)```json\\s*|\\s*```", "").trim();
            log.info("AI Cleaned JSON: {}", cleanedJson);
            
            return objectMapper.readValue(cleanedJson, AiTaskResponse.class);
        } catch (Exception e) {
            log.error("Lỗi parse AI: {}. Raw: {}", e.getMessage(), rawResponse);
            throw new RuntimeException("Dữ liệu AI không hợp lệ: " + e.getMessage());
        }

        

        
    }

    private String callGeminiWithHistory(String systemInstruction, String userPrompt, List<AiContext.Message> history) {
        List<Map<String, Object>> contents = new ArrayList<>();
        
        // Build lịch sử hội thoại
        if (history != null) {
            for (AiContext.Message msg : history) {
                contents.add(Map.of(
                    "role", msg.getRole(),
                    "parts", List.of(Map.of("text", msg.getContent()))
                ));
            }
        }
        
        // Thêm tin nhắn hiện tại của người dùng
        contents.add(Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", userPrompt))
        ));

        // Đóng gói Body theo chuẩn Google AI Studio
        Map<String, Object> body = new HashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        body.put("contents", contents);
        body.put("generationConfig", Map.of(
            "responseMimeType", "application/json",
            "temperature", 0.2
        ));

        try {
            String response = restClient.post()
                    .uri(GEMINI_URL + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            String resultText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            
      
            
            return resultText;
        } catch (Exception e) {
            log.error("Lỗi gọi Gemini API: {}", e.getMessage());
            throw new RuntimeException("Lỗi API Gemini.");
        }
    }
}