package com.fluxboard.project.projectmember.entity;

import com.fluxboard.common.entity.BaseDocument;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_members")
public class ProjectMember extends BaseDocument {

    @Field("project_id")
    private String projectId;

    @Field("user_id")
    private String userId;

    @Field("is_active")
    private boolean isActive = true;

    // Đảm bảo tên field là roleIds (số nhiều) để khớp với hàm setRoleIds
    @Field("role_ids")
    private List<String> roleIds; 
}
