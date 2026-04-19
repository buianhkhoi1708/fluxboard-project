package com.fluxboard.media.service;

import org.springframework.web.multipart.MultipartFile;

public interface MediaService {
    String uploadAvatar(MultipartFile file);
}