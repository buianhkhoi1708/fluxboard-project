package com.fluxboard.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class UserResponseDto {
    private String id;
    private String email;
    private String fullName;
    private String avatarUrl;
    private String role;
    private Instant createdAt;
    private Instant updatedAt;
}