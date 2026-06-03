import React, { useMemo } from 'react';
import { Bell, Mail, MonitorCheck, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNotificationSettings, useUpdateNotifications } from '../hooks/useSettingQueries';

const readBool = (data: any, camelKey: string, snakeKey: string, fallback = true) => {
  const value = data?.[camelKey] ?? data?.[snakeKey];
  return typeof value === 'boolean' ? value : fallback;
};

export const NotificationTab = () => {
  const { data: settings, isLoading, isError } = useNotificationSettings();
  const { mutate: updateSettings, isPending, isSuccess, isError: isUpdateError } = useUpdateNotifications();

  const normalized = useMemo(() => ({
    emailNotificationsEnabled: readBool(settings, 'emailNotificationsEnabled', 'email_notifications_enabled', true),
    inAppNotificationsEnabled: readBool(settings, 'inAppNotificationsEnabled', 'in_app_notifications_enabled', true),
  }), [settings]);

  const handleToggle = (key: 'emailNotificationsEnabled' | 'inAppNotificationsEnabled') => {
    updateSettings({
      ...normalized,
      [key]: !normalized[key],
    });
  };

  const ToggleSwitch = ({
    title,
    description,
    icon,
    enabled,
    onClick,
  }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    enabled: boolean;
    onClick: () => void;
  }) => (
    <div className="flex items-center justify-between gap-3 md:gap-5 p-4 md:p-5 bg-slate-50/80 rounded-xl md:rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-lg md:rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-[13px] md:text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-[11px] md:text-xs text-slate-500 mt-0.5 md:mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 md:h-7 md:w-12 shrink-0 items-center rounded-full transition-colors duration-300 disabled:opacity-60 ${
          enabled ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 md:h-5 md:w-5 transform rounded-full bg-white shadow-sm transition duration-300 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 w-5 h-5 md:w-[22px] md:h-[22px]" />
        <span className="text-[13px] md:text-sm font-semibold">Đang tải cấu hình thông báo...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl p-3 md:p-4 rounded-xl md:rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start sm:items-center gap-2 text-[13px] md:text-sm font-semibold">
        <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-snug">Không thể tải cấu hình thông báo. Vui lòng thử lại.</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Bell className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />
          Cấu hình thông báo
        </h2>
        <p className="text-[12px] md:text-sm text-slate-500 mt-1.5 md:mt-2">
          Các thay đổi được lưu ngay và ảnh hưởng thật đến việc nhận thông báo trong hệ thống.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-4 md:mb-5 p-2.5 md:p-3 rounded-lg md:rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] md:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 md:w-4 md:h-4 shrink-0" />
          Đã cập nhật cấu hình thông báo.
        </div>
      )}

      {isUpdateError && (
        <div className="mb-4 md:mb-5 p-2.5 md:p-3 rounded-lg md:rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[12px] md:text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 md:w-4 md:h-4 shrink-0" />
          Cập nhật thất bại, vui lòng thử lại.
        </div>
      )}

      <div className="space-y-3 md:space-y-4">
        <ToggleSwitch
          title="Nhận thông báo qua email"
          description="Tắt mục này thì hệ thống sẽ không gửi email thông báo như giao việc, deadline, duyệt hoặc từ chối dời hạn."
          icon={<Mail className="w-[18px] h-[18px] md:w-5 md:h-5" />}
          enabled={normalized.emailNotificationsEnabled}
          onClick={() => handleToggle('emailNotificationsEnabled')}
        />

        <ToggleSwitch
          title="Nhận thông báo trong ứng dụng"
          description="Tắt mục này thì bạn sẽ không nhận thông báo in-app/realtime trên topbar và trang thông báo."
          icon={<MonitorCheck className="w-[18px] h-[18px] md:w-5 md:h-5" />}
          enabled={normalized.inAppNotificationsEnabled}
          onClick={() => handleToggle('inAppNotificationsEnabled')}
        />
      </div>
    </div>
  );
};