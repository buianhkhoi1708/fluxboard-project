package com.fluxboard.ai.dto;

import lombok.Data;

@Data
public class AiPromptRequest {
    private String prompt;

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}