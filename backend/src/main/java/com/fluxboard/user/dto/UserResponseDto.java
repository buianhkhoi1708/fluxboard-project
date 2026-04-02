package com.fluxboard.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.Instant;

@Data
public class UserResponseDto {
    private String id;
    
    private String email;
    
    @JsonProperty("full_name")
    private String fullName;
    
    @JsonProperty("avatar_url")
    private String avatarUrl;
    
    @JsonProperty("role_id")
    private String roleId;
    
    @JsonProperty("department_id")
    private String departmentId;
    
    @JsonProperty("team_id")
    private String teamId;
    
    @JsonProperty("created_at")
    private Instant createdAt;
    
    @JsonProperty("updated_at")
    private Instant updatedAt;
    
    @JsonProperty("is_deleted")
    private boolean deleted;
}