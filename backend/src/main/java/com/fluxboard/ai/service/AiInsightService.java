package com.fluxboard.ai.service;

import com.fluxboard.ai.dto.response.AiInsightResponse;
import com.fluxboard.board.task.entity.TaskEntity;
import com.fluxboard.board.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiInsightService {

    private final TaskRepository taskRepository;

    public List<AiInsightResponse> getDeviationInsights(String projectId) {

        List<TaskEntity> completedTasks = taskRepository
                .findByProjectIdAndStatusAndAiSuggestedPointIsNotNull(projectId, "DONE");

        return completedTasks.stream().map(task -> {
            double suggested = task.getAiSuggestedPoint() != null ? task.getAiSuggestedPoint() : 0.0;
            double actual = task.getStoryPoint() != null ? task.getStoryPoint() : 0.0;
            
            double deviationPercent = 0.0;
            if (suggested > 0) {
                deviationPercent = ((actual - suggested) / suggested) * 100.0;
            }

            String status;
            String comment;

            if (Math.abs(deviationPercent) <= 10.0) {
                status = "ACCURATE";
                comment = "AI estimation is highly accurate and aligns closely with the team's actual effort.";
            } else if (deviationPercent > 10.0) {
                status = "UNDERESTIMATED";
                comment = String.format(
                    "AI underestimated the effort. The task was more complex than expected, requiring %.1f%% more effort.", 
                    deviationPercent
                );
            } else {
                status = "OVERESTIMATED";
                comment = String.format(
                    "AI overestimated the effort. The team completed the task faster than expected by %.1f%%.", 
                    Math.abs(deviationPercent)
                );
            }

            double roundedDeviation = Math.round(deviationPercent * 100.0) / 100.0;

            return new AiInsightResponse(
                    task.getId(),
                    task.getTitle(),
                    suggested,
                    actual,
                    roundedDeviation,
                    status,
                    comment
            );
        }).collect(Collectors.toList());
    }
}