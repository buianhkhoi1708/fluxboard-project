package com.fluxboard.board.repository;

import com.fluxboard.board.entity.BoardEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BoardRepository extends MongoRepository<BoardEntity, String> {

    Optional<BoardEntity> findByIdAndDeletedFalse(String id);

    Page<BoardEntity> findByDeletedFalse(Pageable pageable);

    Page<BoardEntity> findByProjectIdAndDeletedFalse(String projectId, Pageable pageable);

    List<BoardEntity> findByProjectIdAndDeletedFalse(String projectId);

    boolean existsByProjectIdAndNameAndDeletedFalse(String projectId, String name);

    boolean existsByProjectIdAndNameAndIdNotAndDeletedFalse(String projectId, String name, String id);
}
