package com.fluxboard.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record AiPromptRequest(
    @NotBlank(message = "Prompt không được để trống")
    String prompt,
    
    @NotBlank(message = "Project ID không được để trống")
    String projectId
) {}