package com.fluxboard.notification.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Document(collection = "notifications")
public class NotificationEntity extends BaseDocument {
    public enum NotificationStatus {
        PENDING,
        SENT
    }

    @Indexed
    @Field("recipient_id")
    private String recipientId;

    @Field("sender_id")
    private String senderId;

    @Indexed
    @Field("type")
    private String type;

    @Field("title")
    private String title;

    @Field("message")
    private String message;

    @Indexed
    @Field("reference_id")
    private String referenceId;

    @Indexed
    @Field("reference_type")
    private String referenceType = "TASK";

    @Field("action_url")
    private String actionUrl;

    @Field("metadata")
    private Map<String, Object> metadata = new LinkedHashMap<>();

    @Field("email_html")
    private String emailHtml;

    @Indexed
    @Field("is_read")
    private boolean isRead = false;

    @Indexed
    @Field("status")
    private NotificationStatus status = NotificationStatus.SENT;

    @Indexed
    @Field("send_at")
    private Instant sendAt;

    @Indexed(unique = true, sparse = true)
    @Field("dedupe_key")
    private String dedupeKey;

    public String getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(String recipientId) {
        this.recipientId = recipientId;
    }

    public String getSenderId() {
        return senderId;
    }

    public void setSenderId(String senderId) {
        this.senderId = senderId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public Map<String, Object> getMetadata() {
        if (metadata == null) metadata = new LinkedHashMap<>();
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata == null ? new LinkedHashMap<>() : metadata;
    }

    public String getEmailHtml() {
        return emailHtml;
    }

    public void setEmailHtml(String emailHtml) {
        this.emailHtml = emailHtml;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        this.isRead = read;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public void setStatus(NotificationStatus status) {
        this.status = status;
    }

    public Instant getSendAt() {
        return sendAt;
    }

    public void setSendAt(Instant sendAt) {
        this.sendAt = sendAt;
    }

    public String getDedupeKey() {
        return dedupeKey;
    }

    public void setDedupeKey(String dedupeKey) {
        this.dedupeKey = dedupeKey;
    }
}