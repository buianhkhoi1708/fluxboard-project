package com.fluxboard.deadline.scheduler;

/**
 * Giữ class để tránh lỗi reference cũ.
 *
 * Logic đang được gom về:
 * - com.fluxboard.notification.job.TaskDeadlineJob#scanAndNotifyApproachingDeadlines
 * - com.fluxboard.notification.job.TaskDeadlineJob#autoRejectExpiredExtensionRequests
 *
 * Không đặt @Component ở đây để tránh gửi trùng thông báo deadline dưới 24 giờ.
 */
public class DeadlineReminderScheduler {
}