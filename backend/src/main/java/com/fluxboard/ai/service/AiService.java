package com.fluxboard.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${GEMINI_API_KEY}")
    private String apiKey;


    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    public AiService(ObjectMapper objectMapper) {
        this.restClient = RestClient.create();
        this.objectMapper = objectMapper;
    }

    public String generateKanbanBoard(String userPrompt) {
        
        String systemInstruction = """
            Bạn là một chuyên gia quản lý dự án cấp cao và Scrum Master hệ thống cho ứng dụng Fluxboard. 
            Nhiệm vụ duy nhất của bạn là phân tích yêu cầu dự án từ người dùng và tự động tạo ra một bảng Kanban chi tiết.

            QUY TẮC BẮT BUỘC (CRITICAL RULES):
            1. BẠN CHỈ ĐƯỢC PHÉP TRẢ VỀ DỮ LIỆU DƯỚI ĐỊNH DẠNG JSON HỢP LỆ. 
            2. KHÔNG ĐƯỢC giải thích, KHÔNG ĐƯỢC chào hỏi, KHÔNG bao bọc bởi markdown.
            3. Bảng Kanban phải luôn có ít nhất 3 cột cơ bản: "To Do", "Doing", "Done".
            4. Danh sách thành viên (Assignees) bắt buộc lấy từ nhóm: Khôi, Quang, Mạnh, Long, Chấn.
            5. Đánh giá độ khó công việc (story_points) theo dãy Fibonacci (1, 2, 3, 5, 8, 13). 
            
            CẤU TRÚC JSON BẮT BUỘC PHẢI TUÂN THỦ NGHIÊM NGẶT:
            {
              "board_name": "[Tên dự án]",
              "description": "[Mô tả mục tiêu dự án]",
              "lists": [
                {
                  "list_name": "[Tên cột]",
                  "order": [Số thứ tự],
                  "cards": [
                    {
                      "title": "[Tên công việc cụ thể]",
                      "description": "[Mô tả chi tiết]",
                      "assignee": "[Tên 1 thành viên]",
                      "priority": "[Chỉ chọn 1: Low, Medium, High, Critical]",
                      "start_date": "[YYYY-MM-DD]",
                      "due_date": "[YYYY-MM-DD]",
                      "estimated_days": [Số ngày],
                      "story_points": [Số điểm chốt],
                      "ai_suggested_points": [Số điểm AI gợi ý],
                      "ai_estimation_reason": "[Giải thích ngắn gọn lý do AI cho số điểm này]",
                      "tags": ["[Tag 1]", "[Tag 2]"],
                      "subtasks": [
                        {
                          "title": "[Tên task con]",
                          "is_done": false
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """;

        try {
            Map<String, Object> requestBody = Map.of(
                "system_instruction", Map.of("parts", Map.of("text", systemInstruction)),
                "contents", List.of(Map.of("parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", Map.of("response_mime_type", "application/json") 
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            String rawResponse = restClient.post()
                    .uri(GEMINI_API_URL + "?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonBody)
                    .retrieve()
                    .body(String.class);

            return extractJsonText(rawResponse);

        } catch (Exception e) {
            System.err.println("Lỗi khi gọi API Gemini: " + e.getMessage());
            throw new RuntimeException("Hệ thống AI đang bận, vui lòng thử lại sau!");
        }
    }

    private String extractJsonText(String rawResponse) throws Exception {
        JsonNode rootNode = objectMapper.readTree(rawResponse);
        return rootNode.path("candidates").get(0)
                       .path("content")
                       .path("parts").get(0)
                       .path("text").asText();
    }
}