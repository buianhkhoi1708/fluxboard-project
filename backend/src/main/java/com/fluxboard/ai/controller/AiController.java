package com.fluxboard.ai.controller;

import com.fluxboard.ai.dto.AiPromptRequest;
import com.fluxboard.ai.service.AiService;
import com.fluxboard.common.dto.ApiResponse; 
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai") // Đã fix vụ lặp link /api/v1/api/v1...
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/generate-board")
    public ResponseEntity<ApiResponse<String>> generateBoard(@RequestBody AiPromptRequest request) {
        // Gọi Service xử lý Prompt
        String kanbanJsonString = aiService.generateKanbanBoard(request.getPrompt());
        
        // Trả về JSON bọc trong ApiResponse chuẩn của team
        return ResponseEntity.ok(
            ApiResponse.success("Tạo bảng bằng AI thành công", kanbanJsonString)
        );
    }
}