package com.fluxboard.board.column.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "board_column")
@CompoundIndex(name = "uniq_board_order_active", def = "{'board_id': 1, 'order': 1, 'is_deleted': 1}", unique = true)
public class BoardColumnEntity extends BaseDocument {

    @Field("board_id")
    private String boardId;

    @Field("name")
    private String name;

    @Field("order")
    private int order;

    public String getBoardId() {
        return boardId;
    }

    public void setBoardId(String boardId) {
        this.boardId = boardId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }
}
