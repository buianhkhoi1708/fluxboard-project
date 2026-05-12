package com.fluxboard.ai.controller;

import com.fluxboard.ai.dto.AiPromptRequest;
import com.fluxboard.ai.dto.AiTaskResponse;
import com.fluxboard.ai.service.AiService;
import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    /**
     * 🚀 API KHỞI TẠO BOARD THÔNG MINH BẰNG AI
     * Nhận lệnh từ Frontend Wizard để phân rã task, gán nhân sự và tính deadline.
     */
    @PostMapping("/boards/{boardId}/generate")
    public ResponseEntity<ApiResponse<AiTaskResponse>> generateTasks(
            @PathVariable String boardId,
            @Valid @RequestBody AiPromptRequest request) {

        // 🚀 CẬP NHẬT: Truyền đủ 5 tham số để khớp với Service V6
        AiTaskResponse response = aiService.generateSmartTasks(
                boardId,
                request.projectId(),
                request.prompt(),
                request.memberIds(),
                request.generationMode(),     // Hứng SIMPLE / ADVANCED
                request.projectStartDate()     // Hứng ngày khởi động để tính Deadline
        );

        return ResponseFactory.ok("AI tasks generated successfully.", response);
    }
}