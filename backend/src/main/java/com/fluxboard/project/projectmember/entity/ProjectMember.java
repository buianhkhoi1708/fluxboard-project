package com.fluxboard.project.projectmember.entity;

import com.fluxboard.common.entity.BaseDocument;
import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "project_members")
@CompoundIndex(name = "uniq_project_user", def = "{'project_id': 1, 'user_id': 1}", unique = true)
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
