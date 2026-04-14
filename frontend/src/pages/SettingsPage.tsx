import React, { useState } from 'react';
import ChangePasswordForm from '../features/board/components/ChangePasswordForm';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold !text-black mb-6">Cài đặt hệ thống</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* Menu Tabs */}
        <div className="w-full md:w-64 bg-gray-100 border-r border-gray-200 p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${
                  activeTab === 'profile' ? 'bg-gray-300 !text-black shadow-md border-black' : 'bg-transparent !text-black border-transparent hover:bg-gray-200'
                }`}
              >
                Hồ sơ cá nhân
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all border ${
                  activeTab === 'security' ? 'bg-gray-300 !text-black shadow-md border-black' : 'bg-transparent !text-black border-transparent hover:bg-gray-200'
                }`}
              >
                Trung tâm bảo mật
              </button>
            </li>
          </ul>
        </div>

        {/* Nội dung Tab */}
        <div className="flex-1 p-8">
          {activeTab === 'profile' && <ProfileTab />}

          {/* Nhúng thẳng Component ChangePasswordForm vào Tab 2 */}
          {activeTab === 'security' && <ChangePasswordForm />}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENT TAB 1: HỒ SƠ CÁ NHÂN
// ==========================================
const ProfileTab = () => {
  const [name, setName] = useState('Hán Dương Long');
  const [avatarPreview, setAvatarPreview] = useState('https://ui-avatars.com/api/?name=Long+Han&background=random');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setAvatarPreview(imageUrl);
    }
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <h2 className="text-2xl font-bold !text-black mb-6">Hồ sơ cá nhân</h2>
      
      <div className="flex items-center gap-6 mb-8">
        <img src={avatarPreview} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-4 border-gray-300 shadow-sm" />
        <div>
          <label className="cursor-pointer bg-gray-200 !text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition border border-black">
            Chọn ảnh đại diện
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        </div>
      </div>

      <div className="space-y-5">
        {/* Khối có thể tương tác (Active) */}
        <div>
          <label className="block text-sm font-bold !text-black mb-1">Họ và tên</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-black focus:border-black !text-black transition outline-none" />
        </div>

        {/* 🚀 Khối Read-only: Đã khôi phục Grid, ép mờ và chặn click chuột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-60 grayscale pointer-events-none mt-2">
          <div>
            <label className="block text-sm font-bold !text-black mb-1">Email</label>
            <input type="email" value="systemadmin@gmail.com" readOnly className="w-full px-4 py-2 bg-gray-200 border border-gray-400 !text-black font-medium rounded-lg cursor-not-allowed outline-none" />
          </div>
          <div>
            {/* Đã trả lại nhãn Phòng ban */}
            <label className="block text-sm font-bold !text-black mb-1">Phòng ban (Dept)</label>
            <input type="text" value="IT Department" readOnly className="w-full px-4 py-2 bg-gray-200 border border-gray-400 !text-black font-medium rounded-lg cursor-not-allowed outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold !text-black mb-1">Vai trò (Role)</label>
            <input type="text" value="System Administrator" readOnly className="w-full px-4 py-2 bg-gray-200 border border-gray-400 !text-black font-medium rounded-lg cursor-not-allowed outline-none" />
          </div>
        </div>

        {/* Nút lưu vẫn sáng để user bấm lưu Tên và Ảnh */}
        <button className="mt-6 bg-gray-200 !text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition shadow-md border border-black">
          Lưu hồ sơ
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;