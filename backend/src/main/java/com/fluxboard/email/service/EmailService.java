package com.fluxboard.email.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
public class EmailService {
    private final JavaMailSender javaMailSender;

    @Value("${EMAIL:}")
    private String systemEmail;

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    public void sendPasswordResetEmail(String toEmail, String resetLink) {
        sendHtmlEmailInternal(
                toEmail,
                "Đặt lại mật khẩu - Fluxboard",
                buildPasswordResetHtml(resetLink),
                "RESET_PASSWORD"
        );
    }

    public void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        sendHtmlEmailInternal(toEmail, subject, htmlContent, "NOTIFICATION");
    }

    private void sendHtmlEmailInternal(String toEmail, String subject, String htmlContent, String purpose) {
        CompletableFuture.runAsync(() -> {
            try {
                validateMailConfig();

                MimeMessage message = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(systemEmail);
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);

                javaMailSender.send(message);
                log.info("[EMAIL:{}] Sent successfully to {}", purpose, toEmail);
            } catch (MailAuthenticationException e) {
                log.error("[EMAIL:{}] Gmail authentication failed. Hãy kiểm tra EMAIL và EMAIL_PASSWORD. Gmail cần App Password, không dùng mật khẩu Gmail thường. To={}", purpose, toEmail, e);
            } catch (MailSendException e) {
                log.error("[EMAIL:{}] Mail send failed. To={}, message={}", purpose, toEmail, e.getMessage(), e);
            } catch (Exception e) {
                log.error("[EMAIL:{}] Unexpected email error. To={}, message={}", purpose, toEmail, e.getMessage(), e);
            }
        });
    }

    private void validateMailConfig() {
        if (!StringUtils.hasText(systemEmail)) {
            throw new IllegalStateException("Missing EMAIL environment variable.");
        }
    }

    private String buildPasswordResetHtml(String resetLink) {
        return "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#334155;line-height:1.6\">"
                + "<h2 style=\"color:#4F46E5;text-align:center;margin:0 0 20px\">Fluxboard</h2>"
                + "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Fluxboard của bạn.</p>"
                + "<p>Nhấn nút bên dưới để tạo mật khẩu mới:</p>"
                + "<div style=\"text-align:center;margin:30px 0\">"
                + "<a href=\"" + resetLink + "\" style=\"background:#4F46E5;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block\">Đặt lại mật khẩu</a>"
                + "</div>"
                + "<p>Hoặc sao chép liên kết này vào trình duyệt:</p>"
                + "<p style=\"word-break:break-all\"><a href=\"" + resetLink + "\" style=\"color:#4F46E5\">" + resetLink + "</a></p>"
                + "<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:30px 0\"/>"
                + "<p style=\"font-size:12px;color:#64748b;text-align:center\">Liên kết sẽ hết hạn sau 15 phút.<br/>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>"
                + "</div>";
    }
}