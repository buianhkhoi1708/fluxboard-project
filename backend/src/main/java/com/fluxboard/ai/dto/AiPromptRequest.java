package com.fluxboard.ai.dto;

import lombok.Data;

@Data
public class AiPromptRequest {
    private String prompt;

    // Viết sẵn Getter/Setter để fix cứng lỗi "cannot find symbol" của Maven
    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}