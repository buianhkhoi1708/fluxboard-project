package com.fluxboard.media.service.impl;

import com.fluxboard.media.service.MediaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class S3ServiceImpl implements MediaService {

    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.s3.region}")
    private String region;

    public S3ServiceImpl(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    @Override
    public Map<String, String> generatePresignedUrl(String originalFileName, String contentType) {
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String uniqueKey = "avatars/" + UUID.randomUUID().toString() + extension;

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(uniqueKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

        String publicUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, uniqueKey);

        Map<String, String> result = new HashMap<>();
        result.put("uploadUrl", presignedRequest.url().toString());
        result.put("avatarUrl", publicUrl);                   
        result.put("key", uniqueKey);
        
        return result;
    }
}