import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useUpdateProfile } from '../hooks/useSettingQueries';
import { useSettingUiStore } from '../store/useSettingUIStore';
import { useRolesDictionary } from '../../rbac/hooks/useRbacQueries';

export const ProfileTab: React.FC = () => {
  const { user } = useAuthStore();
  const { message, setMessage, clearMessage } = useSettingUiStore();
  
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { data: roles = [], isLoading: isLoadingRoles } = useRolesDictionary();

  const [name, setName] = useState(user?.full_name || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(user?.avatar_url || '');

  useEffect(() => {
    clearMessage();
  }, [clearMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSave = () => {
    const userId = user?.id || user?.user_id;
    if (!userId) return;

    updateProfile(
      { userId, name, file },
      {
        onSuccess: () => setMessage('success', 'Cập nhật hồ sơ thành công!'),
        onError: (err: any) => setMessage('error', err.response?.data?.message || 'Có lỗi xảy ra!')
      }
    );
  };

  // 🚀 Map Role ID sang Role Name
  const matchedRole = roles.find((r) => r.id === user?.role_id || r.name === user?.system_role);
  const displayRoleName = isLoadingRoles 
    ? 'Đang tải...' 
    : (matchedRole?.name || user?.system_role || 'Chưa xác định');

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
        <img 
          src={preview || `https://ui-avatars.com/api/?name=${name}`} 
          className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm bg-white" 
          alt="Avatar Preview" 
        />
        <label className="cursor-pointer bg-white text-slate-700 px-5 py-2.5 rounded-xl font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
          Đổi ảnh đại diện
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ và tên</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full px-4 py-2.5 border border-slate-300 text-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              readOnly 
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phòng ban</label>
            <input 
              type="text" 
              value={user?.department || 'Chưa xác định'} 
              readOnly 
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vai trò hệ thống</label>
            <input 
              type="text" 
              value={displayRoleName} 
              readOnly 
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 font-medium rounded-xl cursor-not-allowed outline-none" 
            />
          </div>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={isPending} 
          className="mt-8 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-70 transition-all flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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