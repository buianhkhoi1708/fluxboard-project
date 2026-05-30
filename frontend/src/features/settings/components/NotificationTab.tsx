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
    <div className="flex items-center justify-between gap-5 p-5 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={onClick}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 disabled:opacity-60 ${
          enabled ? 'bg-indigo-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-300 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600" size={22} />
        <span className="text-sm font-semibold">Đang tải cấu hình thông báo...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle size={18} />
        Không thể tải cấu hình thông báo. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Bell size={24} className="text-indigo-600" />
          Cấu hình thông báo
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Các thay đổi được lưu ngay và ảnh hưởng thật đến việc nhận thông báo trong hệ thống.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          Đã cập nhật cấu hình thông báo.
        </div>
      )}

      {isUpdateError && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          Cập nhật thất bại, vui lòng thử lại.
        </div>
      )}

      <div className="space-y-4">
        <ToggleSwitch
          title="Nhận thông báo qua email"
          description="Tắt mục này thì hệ thống sẽ không gửi email thông báo như giao việc, deadline, duyệt hoặc từ chối dời hạn."
          icon={<Mail size={20} />}
          enabled={normalized.emailNotificationsEnabled}
          onClick={() => handleToggle('emailNotificationsEnabled')}
        />

        <ToggleSwitch
          title="Nhận thông báo trong ứng dụng"
          description="Tắt mục này thì bạn sẽ không nhận thông báo in-app/realtime trên topbar và trang thông báo."
          icon={<MonitorCheck size={20} />}
          enabled={normalized.inAppNotificationsEnabled}
          onClick={() => handleToggle('inAppNotificationsEnabled')}
        />
      </div>
    </div>
  );
};