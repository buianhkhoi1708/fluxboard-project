package com.fluxboard.notification.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Map;

@Document(collection = "notifications")
public class NotificationEntity extends BaseDocument {

    @Indexed
    @Field("recipient_id")
    private String recipientId;

    @Field("type")
    private String type;

    @Field("title")
    private String title;

    @Field("message")
    private String message;

    @Field("is_read")
    private boolean isRead = false;

    @Field("metadata")
    private Map<String, Object> metadata;

    // =========================================================================
    // KHỞI TẠO CÁC HÀM GETTER/SETTER TƯỜNG MINH ĐỂ ĐẢM BẢO KHÔNG LỖI BIÊN DỊCH
    // =========================================================================
    
    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { this.isRead = read; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}