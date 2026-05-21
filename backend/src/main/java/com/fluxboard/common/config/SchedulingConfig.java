package com.fluxboard.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
@EnableScheduling // Bật tính năng chạy ngầm đếm ngược
public class SchedulingConfig {

    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5); // Cho phép chạy song song 5 đồng hồ
        scheduler.setThreadNamePrefix("Notif-Timer-");
        scheduler.initialize();
        return scheduler;
    }
}