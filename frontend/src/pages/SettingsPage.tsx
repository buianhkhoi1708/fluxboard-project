import React, { useState, useEffect } from 'react';
import ChangePasswordForm from '../features/board/components/ChangePassWordForm';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { userApi } from '../features/user/api/userApi';
import { useRbacStore } from '../features/rbac/store/useRbacStore'; 

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
// COMPONENT TAB 1: HỒ SƠ CÁ NHÂN
// ==========================================
const ProfileTab = () => {
  const { user, updateUserProfile } = useAuthStore();
  
  // 🚀 2. Lấy danh sách roles và hàm fetch từ RBAC Store
  const { roles, fetchInitialData } = useRbacStore();

  const [name, setName] = useState(user?.full_name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || `https://ui-avatars.com/api/?name=${name || 'User'}&background=random`);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 🚀 3. Tự động load danh sách Roles nếu chưa có
  useEffect(() => {
    if (roles.length === 0) {
      fetchInitialData();
    }
  }, [roles.length, fetchInitialData]);

  // Đồng bộ data từ Auth Store
  useEffect(() => {
    if (user) {
      setName(user.full_name || '');
      if (user.avatar_url) setAvatarPreview(user.avatar_url);
    }
  }, [user]);

  // 🚀 4. Logic bóc tách tên Role thật từ danh sách Roles
  // Dò tìm role trong mảng roles có id hoặc name khớp với system_role / role_id của user
  const matchedRole = roles.find((r: any) => 
    r.id === user?.role_id || 
    r.name === user?.system_role || 
    r.id === user?.system_role
  );
  
  // Nếu tìm thấy thì hiển thị tên chuẩn, nếu không thì dùng tên thô từ Backend, bí quá thì để "Chưa xác định"
  const displayRoleName = matchedRole?.name || user?.system_role || 'Chưa xác định';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file); 
      const imageUrl = URL.createObjectURL(file);
      setAvatarPreview(imageUrl); 
    }
  };


const handleSave = async () => {
  setIsSaving(true);
  setMessage({ type: '', text: '' });

  // ✅ Normalize userId (chống backend đổi field)
  const userId = user?.id ?? (user as any)?.user_id;

  if (!userId) {
    setMessage({ type: 'error', text: 'Không tìm thấy ID người dùng.' });
    setIsSaving(false);
    return;
  }

  try {
    // ✅ Update name
    await userApi.updateUser(userId, { full_name: name });

    let newAvatarUrl = avatarPreview;

    // ✅ Upload avatar nếu có file
    if (selectedFile) {
      const uploadedUrl = await userApi.uploadAvatar(userId, selectedFile);
      if (uploadedUrl) newAvatarUrl = uploadedUrl;
    }

    // ✅ Update store
    updateUserProfile({
      full_name: name,
      avatar_url: newAvatarUrl
    });

    setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
    setSelectedFile(null);

  } catch (error: any) {
    console.error("Lỗi cập nhật profile:", error);

    setMessage({
      type: 'error',
      text: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!'
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
        <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm" />
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
            {/* 🚀 5. Đưa tên Role chuẩn đã bóc tách được vào UI */}
            <input type="text" value={displayRoleName} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="mt-8 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-70 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang lưu...
            </>
          ) : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 3: THÔNG BÁO 
// ==========================================
const NotificationTab = () => {
  const [toggles, setToggles] = useState({
    tasks: true,
    comments: true,
    reminders: false,
    announcements: true,
    messages: true,
    mentions: true,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleSwitch = ({ label, stateKey }: { label: string, stateKey: keyof typeof toggles }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button 
        onClick={() => handleToggle(stateKey)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${toggles[stateKey] ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 ${toggles[stateKey] ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Notification Center</h2>
      <p className="text-sm text-slate-500 mb-8">Quản lý cách bạn nhận thông tin từ hệ thống.</p>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Project Notifications</h3>
          <div className="space-y-3">
            <ToggleSwitch label="Khi được giao việc" stateKey="tasks" />
            <ToggleSwitch label="Nhắc nhở sắp đến hạn" stateKey="reminders" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Communication Channels</h3>
          <div className="space-y-3">
            <ToggleSwitch label="Thông báo toàn hệ thống" stateKey="announcements" />
            <ToggleSwitch label="Tin nhắn trực tiếp" stateKey="messages" />
            <ToggleSwitch label="Khi bị nhắc tên @" stateKey="mentions" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;