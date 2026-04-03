package com.fluxboard.user.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class UserUpdateRequest {
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

}
