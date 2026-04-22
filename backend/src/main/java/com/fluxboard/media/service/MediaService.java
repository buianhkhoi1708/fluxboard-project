package com.fluxboard.media.service;

import java.util.Map;

public interface MediaService {
    Map<String, String> generatePresignedUrl(String fileName, String contentType);
}