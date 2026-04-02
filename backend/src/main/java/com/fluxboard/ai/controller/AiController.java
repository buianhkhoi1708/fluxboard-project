package com.fluxboard.ai.controller;

import com.fluxboard.ai.dto.AiPromptRequest;
import com.fluxboard.ai.service.AiService;
import com.fluxboard.common.dto.ApiResponse; 
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/generate-board")
    public ResponseEntity<ApiResponse<String>> generateBoard(@RequestBody AiPromptRequest request) {
        String kanbanJsonString = aiService.generateKanbanBoard(request.getPrompt());
        
        return ResponseEntity.ok(
            ApiResponse.success("Tạo bảng bằng AI thành công", kanbanJsonString)
        );
    }
}