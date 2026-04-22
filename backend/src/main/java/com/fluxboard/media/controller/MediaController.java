package com.fluxboard.media.controller;

import com.fluxboard.common.dto.ApiResponse;
import com.fluxboard.common.util.ResponseFactory;
import com.fluxboard.media.service.MediaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/media")
public class MediaController {

    private final MediaService mediaService;

    public MediaController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponse<Map<String, String>>> getPresignedUrl(
            @RequestParam String fileName,
            @RequestParam String contentType) {
        
        Map<String, String> urls = mediaService.generatePresignedUrl(fileName, contentType);
        
        return ResponseFactory.ok("Successfully generated presigned URL", urls);
    }
}