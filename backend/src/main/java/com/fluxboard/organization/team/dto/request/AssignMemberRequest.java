package com.fluxboard.organization.team.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignMemberRequest {
    
    @NotBlank(message = "User ID is required")
    @JsonProperty("user_id") // Ánh xạ chuẩn với snake_case từ Frontend gửi lên
    private String userId;

    @NotBlank(message = "Department ID is required")
    @JsonProperty("department_id")
    private String departmentId;
}