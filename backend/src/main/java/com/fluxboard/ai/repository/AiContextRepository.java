package com.fluxboard.ai.repository;

import com.fluxboard.ai.entity.AiContext;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiContextRepository extends MongoRepository<AiContext, String> {
    Optional<AiContext> findByBoardIdAndDeletedFalse(String boardId);
}