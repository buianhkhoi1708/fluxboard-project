package com.fluxboard.board.column.repository;

import com.fluxboard.board.column.entity.BoardColumnEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BoardColumnRepository extends MongoRepository<BoardColumnEntity, String> {

    Optional<BoardColumnEntity> findByIdAndDeletedFalse(String id);

    Page<BoardColumnEntity> findByDeletedFalse(Pageable pageable);

    Page<BoardColumnEntity> findByBoardIdAndDeletedFalse(String boardId, Pageable pageable);

    List<BoardColumnEntity> findByBoardIdAndDeletedFalseOrderByOrderAsc(String boardId);

    List<BoardColumnEntity> findByBoardIdAndDeletedFalseAndOrderGreaterThanEqualOrderByOrderAsc(
            String boardId,
            int order
    );

    List<BoardColumnEntity> findByBoardIdAndDeletedFalseAndOrderGreaterThanOrderByOrderAsc(
            String boardId,
            int order
    );

    boolean existsByBoardIdAndNameAndDeletedFalse(String boardId, String name);

    boolean existsByBoardIdAndNameAndIdNotAndDeletedFalse(String boardId, String name, String id);

    List<BoardColumnEntity> findByBoardIdInAndDeletedFalseOrderByBoardIdAscOrderAsc(List<String> boardIds);
}
