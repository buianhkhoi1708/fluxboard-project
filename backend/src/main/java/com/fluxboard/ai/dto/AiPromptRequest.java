package com.fluxboard.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record AiPromptRequest(
    @NotBlank(message = "Prompt không được để trống")
    String prompt,
    
    @JsonProperty("project_id") // Khớp với SNAKE_CASE
    @NotBlank(message = "Project ID không được để trống")
    String projectId,

    @JsonProperty("member_ids") // 🚀 CHÌA KHÓA ĐÂY SẾP!
    @NotEmpty(message = "Danh sách nhân sự không được để trống")
    List<String> memberIds
) {}