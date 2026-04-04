package com.fluxboard.board.column.entity;

import com.fluxboard.common.entity.BaseDocument;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "board_column")
@CompoundIndex(name = "idx_board_position", def = "{'board_id': 1, 'position': 1}")
public class BoardColumnEntity extends BaseDocument {

    @Field("board_id")
    private String boardId;

    @Field("name")
    private String name;

    @Field("position")
    private int position;

    @Field("is_done_column")
    private boolean doneColumn;

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

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public boolean isDoneColumn() {
        return doneColumn;
    }

    public void setDoneColumn(boolean doneColumn) {
        this.doneColumn = doneColumn;
    }
}
