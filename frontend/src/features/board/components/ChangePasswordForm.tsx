import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../auth/authApi';
import logoImg from '../../../assets/icon.svg'; 

const ChangePasswordForm = () => {
  // 1. Quản lý State của Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 2. Quản lý UX
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  const navigate = useNavigate();

  // 3. Xử lý Logic Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ các trường!' });
    }
    if (newPassword.length < 6) {
      return setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
    }
    if (newPassword !== confirmPassword) {
      return setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
    }
    if (currentPassword === newPassword) {
      return setMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại!' });
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword
      });

      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      localStorage.removeItem('token'); 
      setTimeout(() => navigate('/login'), 2000);

    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
         setMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!' });
         localStorage.removeItem('token'); 
         setTimeout(() => navigate('/login'), 2000);
         return;
      }

      const errorMsg = error.response?.data?.message || 'Mật khẩu hiện tại không chính xác hoặc có lỗi xảy ra.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false); 
    }
  };

  // 4. Giao diện (UI)
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-tr from-cyan-700 via-slate-800 to-indigo-900">
      
      <div className="w-full max-w-[420px] bg-[#f4f5f8] rounded-[24px] p-8 shadow-2xl">
        
        {/* Header: Logo & Text */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-500 rounded-xl flex items-center justify-center mb-4 shadow-md">
             <img src={logoImg} alt="Fluxboard Logo" className="h-8 w-8 object-contain filter brightness-0 invert" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 tracking-wide">
            Đổi mật khẩu Fluxboard
          </h2>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Vui lòng thiết lập mật khẩu mới an toàn
          </p>
        </div>

        {/* Khung báo lỗi / Thành công */}
        {message.text && (
          <div className={`p-3 mb-5 rounded-xl text-sm font-medium border text-center ${
            message.type === 'error' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Mật khẩu hiện tại */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Mật khẩu hiện tại</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-300/60 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-500 font-medium transition-all"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder=""
              disabled={isLoading}
            />
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Mật khẩu mới</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-300/60 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-500 font-medium transition-all"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder=""
              disabled={isLoading}
            />
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Xác nhận mật khẩu</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-300/60 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-500 font-medium transition-all"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder=""
              disabled={isLoading}
            />
          </div>

          {/* Nút Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-4 py-3.5 px-4 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2
              ${isLoading 
                ? 'bg-[#111827]/70 cursor-not-allowed' 
                : 'bg-[#111827] hover:bg-black active:scale-[0.98]'
              }`}
          >
            {isLoading ? 'Đang xử lý...' : (
              <>
                Xác nhận thay đổi
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordForm;