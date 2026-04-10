package com.fluxboard.email.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${EMAIL}")
    private String systemEmail;

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(systemEmail);
        message.setTo(toEmail);
        message.setSubject("Password Reset Request - Fluxboard");
        message.setText("You have requested to reset the password for your Fluxboard account.\n\n"
                + "Please click the link below to set a new password:\n"
                + resetLink + "\n\n"
                + "This link will automatically expire after 15 minutes.\n"
                + "If you did not make this request, please ignore this email.");

        CompletableFuture.runAsync(() -> {
            try {
                javaMailSender.send(message);
            } catch (Exception e) {
                System.err.println("Email sending error to " + toEmail + ": " + e.getMessage());
            }
        });
    }
}