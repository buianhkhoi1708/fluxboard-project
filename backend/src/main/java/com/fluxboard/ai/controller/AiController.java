package com.fluxboard.ai.controller;

import com.fluxboard.ai.dto.AiPromptRequest;
import com.fluxboard.ai.dto.AiTaskResponse;
import com.fluxboard.ai.service.AiService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;
    @PostMapping("/boards/{boardId}/generate")
public ResponseEntity<?> generateTasks(
        @PathVariable String boardId,
        @RequestBody AiPromptRequest request) { // 🚀 Dùng DTO sếp vừa thêm memberIds

    try {
        // 🚀 THÊM request.memberIds() VÀO CHỖ NÀY
        AiTaskResponse response = aiService.generateSmartTasks(
                boardId, 
                request.projectId(), 
                request.prompt(), 
                request.memberIds() // <--- Chìa khóa đây sếp!
        );
        
        return ResponseEntity.ok(response);
    } catch (Exception e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
  
}