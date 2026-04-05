package com.fluxboard.board.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "boards")
@CompoundIndex(name = "idx_project_name", def = "{'project_id': 1, 'name': 1}")
public class BoardEntity extends BaseDocument {

    @Field("project_id")
    private String projectId;

    @Field("name")
    private String name;

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
