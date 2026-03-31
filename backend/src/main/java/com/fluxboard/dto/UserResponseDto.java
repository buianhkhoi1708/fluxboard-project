package com.fluxboard.dto;

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
    
    private String role;
    
    @JsonProperty("created_at")
    private Instant createdAt;
    
    @JsonProperty("updated_at")
    private Instant updatedAt;
}