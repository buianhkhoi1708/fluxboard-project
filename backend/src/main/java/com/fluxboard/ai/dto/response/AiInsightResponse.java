package com.fluxboard.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AiInsightResponse {
    private String taskId;
    private String title;
    private double suggestedPoint;
    private double actualPoint;
    private double deviationPercentage;
    private String deviationStatus;
    private String evaluationComment;
}