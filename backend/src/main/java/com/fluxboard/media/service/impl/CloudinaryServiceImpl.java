package com.fluxboard.media.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fluxboard.common.exception.AppException;
import com.fluxboard.common.exception.ErrorCode;
import com.fluxboard.media.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryServiceImpl implements MediaService {

    private final Cloudinary cloudinary;

@Override
    public String uploadAvatar(MultipartFile file) {
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        
        boolean isImageHeader = contentType != null && contentType.startsWith("image/");
        boolean hasImageExtension = originalFilename != null && 
            (originalFilename.toLowerCase().endsWith(".png") || 
             originalFilename.toLowerCase().endsWith(".jpg") || 
             originalFilename.toLowerCase().endsWith(".jpeg"));

        if (!isImageHeader || !hasImageExtension) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Only valid image file formats (.png, .jpg, .jpeg) are allowed for uploading!");
        }
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "fluxboard/avatars",
                    "resource_type", "image"
            ));
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            throw new AppException(ErrorCode.UPLOAD_FAILED, "Failed to upload image to Cloudinary");
        }
    }
}