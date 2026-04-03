package com.fluxboard.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fluxboard.common.entity.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseDocument {

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    @JsonProperty("full_name")
    private String fullName;

    @JsonProperty("avatar_url")
    private String avatarUrl = "https://ui-avatars.com/api/?name=User&background=random";

    @JsonProperty("role_id")
    private String roleId;

    @JsonProperty("department_id")
    private String departmentId;

    @JsonProperty("team_id")
    private String teamId;
}