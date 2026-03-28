package com.fluxboard.common.startup;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseStartupCheck implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseStartupCheck.class);

    private final MongoTemplate mongoTemplate;

    public DatabaseStartupCheck(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            Document result = mongoTemplate.getDb().runCommand(new Document("ping", 1));
            log.info("MongoDB connected successfully. Database: {}, Ping response: {}",
                    mongoTemplate.getDb().getName(),
                    result.toJson());
        } catch (Exception e) {
            log.error("Failed to connect to MongoDB: {}", e.getMessage(), e);
        }
    }
}