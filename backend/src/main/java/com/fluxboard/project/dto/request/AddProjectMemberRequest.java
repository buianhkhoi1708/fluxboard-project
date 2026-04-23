package com.fluxboard.project.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record AddProjectMemberRequest(
        @NotBlank(message = "User ID cannot be blank")
        @JsonProperty("user_id") // Bắt chuẩn snake_case từ Frontend gửi lên
        String userId,

        @JsonProperty("role_ids")
        List<String> roleIds
) {
}