package com.fluxboard.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AiPromptRequest(
    @NotBlank(message = "Prompt không được để trống")
    String prompt,
    
    @JsonProperty("project_id")
    @NotBlank(message = "Project ID không được để trống")
    String projectId,

    @JsonProperty("member_ids")
    @NotEmpty(message = "Danh sách nhân sự không được để trống")
    List<String> memberIds,

    // 🚀 BỔ SUNG ĐỂ KHỚP VỚI FRONTEND V5
    @JsonProperty("generation_mode")
    String generationMode, // SIMPLE hoặc ADVANCED

    @JsonProperty("project_start_date")
    String projectStartDate // Định dạng YYYY-MM-DD từ Frontend
) {}