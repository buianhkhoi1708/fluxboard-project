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
    public ResponseEntity<ApiResponse<AiTaskResponse>> generate(
            @PathVariable String boardId,
            @RequestBody AiPromptRequest request) {
        
        // Gọi Service xử lý AI, lưu DB và trả về data
        AiTaskResponse data = aiService.generateSmartTasks(
                boardId, 
                request.projectId(), 
                request.prompt()
        );

        // TỐI ƯU: Dùng ResponseFactory để thống nhất format toàn hệ thống
        return ResponseFactory.ok("AI đã phân rã task thành công!", data);
    }
}