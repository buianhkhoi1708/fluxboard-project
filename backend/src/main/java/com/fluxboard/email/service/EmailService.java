package com.fluxboard.email.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
        CompletableFuture.runAsync(() -> {
            try {
                MimeMessage message = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(systemEmail);
                helper.setTo(toEmail);
                helper.setSubject("Password Reset Request - Fluxboard");

                String htmlContent = "<div style=\"font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333; line-height: 1.6;\">"
                        + "<h2 style=\"color: #4F46E5; text-align: center;\">Fluxboard</h2>"
                        + "<p>You have requested to reset the password for your Fluxboard account.</p>"
                        + "<p>Please click the button below to set a new password:</p>"
                        + "<div style=\"text-align: center; margin: 30px 0;\">"
                        + "<a href=\"" + resetLink + "\" style=\"background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;\">Reset Password</a>"
                        + "</div>"
                        + "<p>Or copy and paste this link into your browser:</p>"
                        + "<p style=\"word-break: break-all;\"><a href=\"" + resetLink + "\" style=\"color: #4F46E5;\">" + resetLink + "</a></p>"
                        + "<hr style=\"border: none; border-top: 1px solid #eeeeee; margin: 30px 0;\" />"
                        + "<p style=\"font-size: 12px; color: #888888; text-align: center;\">"
                        + "This link will automatically expire after 15 minutes.<br>"
                        + "If you did not make this request, please ignore this email."
                        + "</p>"
                        + "</div>";
                helper.setText(htmlContent, true);

                javaMailSender.send(message);
            } catch (Exception e) {
                System.err.println("Email sending error to " + toEmail + ": " + e.getMessage());
            }
        });
    }
}