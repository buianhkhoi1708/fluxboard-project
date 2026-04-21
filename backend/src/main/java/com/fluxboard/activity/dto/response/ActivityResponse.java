package com.fluxboard.activity.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ActivityResponse {
    private String id;
    private String projectId;
    private String userId;
    private String userName;   
    private String userAvatar; 
    private String action;     
    private LocalDateTime createdAt;
}