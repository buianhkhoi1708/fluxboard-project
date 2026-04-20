import React, { useState, useEffect } from 'react';
import ChangePasswordForm from '../features/board/components/ChangePasswordForm';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { userApi } from '../features/user/api/userApi';
import { User, Loader2 } from 'lucide-react';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full h-full overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Menu Tabs bên trái */}
        <div className="w-full md:w-72 bg-slate-50/50 border-r border-slate-200 p-5 shrink-0">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'profile' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' 
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                Hồ sơ cá nhân
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'security' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' 
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                Trung tâm bảo mật
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/50' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                Cấu hình thông báo
              </button>
            </li>
          </ul>
        </div>

        {/* Nội dung Tab bên phải */}
        <div className="flex-1 p-8 md:p-10 relative">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'security' && <div className="animate-in fade-in duration-300"><ChangePasswordForm /></div>}
          {activeTab === 'notifications' && <NotificationTab />}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 1: HỒ SƠ CÁ NHÂN (ĐÃ NỐI API)
// ==========================================
const ProfileTab = () => {
  const { user, updateUserProfile } = useAuthStore();

  // Khởi tạo state nội bộ từ global state
  const targetId = user?.id || (user as any)?.userId || (user as any)?.user_id;
  const [name, setName] = useState(user?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      if (user.avatar_url) setAvatarPreview(user.avatar_url);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    if (!targetId || !user) {
      setMessage({ type: 'error', text: 'Lỗi: Không tìm thấy ID người dùng. Hãy thử đăng xuất và đăng nhập lại!' });
      setIsSaving(false);
      return; 
    }
    
    try {
      let finalAvatarUrl = user?.avatar_url;

      // 1. Upload ảnh (nếu có chọn)
      if (selectedFile) {
        const avatarResponse = await userApi.uploadAvatar(String(targetId), selectedFile);
        finalAvatarUrl = avatarResponse.data;
      }

      // 2. Cập nhật tên (nếu có sửa)
      if (name !== user?.full_name) {
        await userApi.updateUser(String(targetId), { full_name: name });
      }

      // 3. Đồng bộ State để Sidebar/Navbar đổi ngay
      updateUserProfile({ full_name: name, avatar_url: finalAvatarUrl || user?.avatar_url || '' });
      setSelectedFile(null); 
      setMessage({ type: 'success', text: 'Lưu hồ sơ thành công!' });

    } catch (error: any) {
      console.error("Lỗi cập nhật Profile:", error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ. Vui lòng thử lại.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Hồ sơ cá nhân</h2>
      
      {message.text && (
        <div className={`p-3 mb-6 rounded-xl text-sm font-medium border ${
          message.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-6 mb-10">
        {avatarPreview ? (
          <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-4xl border-4 border-slate-100 shadow-sm">
            {name?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}

        <div>
          <label className="cursor-pointer bg-white text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition border border-slate-200 shadow-sm block">
            Đổi ảnh đại diện
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ và tên</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-4 py-2.5 border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none" 
          />
        </div>

        {/* Các trường Read-only được làm màu xám nhạt tự nhiên */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={user?.email || ''} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phòng ban (Dept)</label>
            <input type="text" value={user?.department || 'Chưa xác định'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vai trò (Role)</label>
            <input type="text" value={user?.system_role || 'MEMBER'} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="mt-8 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-70 flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 3: THÔNG BÁO (TOGGLE UI)
// ==========================================
const NotificationTab = () => {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const targetId = user?.id || (user as any)?.userId || (user as any)?.user_id;


  const [toggles, setToggles] = useState({
    email_notifications_enabled: true,
    in_app_notifications_enabled: true,
    notify_on_task_assign: true,
    notify_on_due_date: false,
    notify_on_comment_mention: true,
  });

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!targetId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await userApi.getNotificationPrefs(String(targetId));
        if (response.data) {
          setToggles({
            email_notifications_enabled: response.data.email_notifications_enabled ?? true,
            in_app_notifications_enabled: response.data.in_app_notifications_enabled ?? true,
            notify_on_task_assign: response.data.notify_on_task_assign ?? true,
            notify_on_due_date: response.data.notify_on_due_date ?? false,
            notify_on_comment_mention: response.data.notify_on_comment_mention ?? true,
          });
        }
      } catch (error) {
        console.error("Lỗi lấy cấu hình thông báo:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, [targetId]);

  const handleToggle = async (stateKey: keyof typeof toggles) => {
    if (!targetId) return;

    // Optimistic UI Update
    const newToggles = { ...toggles, [stateKey]: !toggles[stateKey] };
    setToggles(newToggles);

    try {
      // Gửi cấu hình lên Backend để lưu vào Database
      await userApi.updateNotificationPrefs(String(targetId), newToggles as any);
    } catch (error) {
      console.error("Lỗi lưu thông báo:", error);
      setToggles(toggles); // Hoàn tác UI nếu gọi API thất bại
      alert("Không thể lưu cấu hình, vui lòng thử lại!");
    }
  };

  const ToggleSwitch = ({ label, description, stateKey }: { label: string, description?: string, stateKey: keyof typeof toggles }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="pr-4">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {description && <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{description}</p>}
      </div>
      <button 
        onClick={() => handleToggle(stateKey)}
        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${toggles[stateKey] ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${toggles[stateKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Trung tâm Thông báo</h2>
      <p className="text-sm text-slate-500 mb-8">Quản lý các kênh nhận thông tin từ hệ thống Fluxboard.</p>
      
      <div className="space-y-8">
        
        {/* KÊNH NHẬN */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Kênh nhận (Channels)</h3>
          <div className="space-y-3">
            <ToggleSwitch 
              label="In-app Notification (Thông báo trong app)" 
              description="Nhận thông báo trực tiếp qua quả chuông ở góc phải màn hình."
              stateKey="in_app_notifications_enabled" 
            />
            <ToggleSwitch 
              label="Email" 
              description="Hệ thống sẽ gửi email báo cáo công việc đến hộp thư của bạn."
              stateKey="email_notifications_enabled" 
            />
          </div>
        </div>

        {/* SỰ KIỆN NHẬN */}
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Sự kiện nhận (Events)</h3>
          <div className="space-y-3">
            <ToggleSwitch 
              label="Khi có Task mới được Assign." 
              stateKey="notify_on_task_assign" 
            />
            <ToggleSwitch 
              label="Khi Task sắp đến hạn (due_date < 24h)." 
              stateKey="notify_on_due_date" 
            />
            <ToggleSwitch 
              label="Khi có task_comments mới tag tên mình." 
              stateKey="notify_on_comment_mention" 
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;