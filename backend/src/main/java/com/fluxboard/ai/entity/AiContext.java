package com.fluxboard.ai.entity;

import com.fluxboard.common.entity.BaseDocument;
import lombok.*; // Dùng @Getter @Setter cho chắc nếu @Data bị lỗi
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "ai_contexts")
public class AiContext extends BaseDocument {
    @Field("board_id")
    private String boardId;

    @Field("messages")
    private List<Message> messages = new ArrayList<>();

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Message {
        private String role; 
        private String content;
    }
}