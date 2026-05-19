package com.fluxboard.board.task.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class TaskAttachmentRequest {
    @NotBlank(message = "Tên file không được để trống")
    private String fileName;

    @NotBlank(message = "Đường dẫn file không được để trống")
    private String fileUrl;

    private String contentType; // VD: image/png, application/pdf
    
    private Long fileSize; // Dung lượng (byte) - tuỳ chọn
}