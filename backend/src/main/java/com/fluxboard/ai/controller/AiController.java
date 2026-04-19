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
    public ResponseEntity<ApiResponse<AiTaskResponse>> generateTasks(
            @PathVariable String boardId,
            @RequestBody AiPromptRequest request) {

        // Exception (nếu có) sẽ bị đẩy thẳng ra ngoài và được GlobalExceptionHandler xử lý
        AiTaskResponse response = aiService.generateSmartTasks(
                boardId,
                request.projectId(),
                request.prompt(),
                request.memberIds()
        );

        return ResponseFactory.ok("AI tasks generated successfully.", response);
    }
}