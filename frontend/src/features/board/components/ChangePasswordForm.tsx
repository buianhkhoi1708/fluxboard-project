import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../auth/authApi';
import logoImg from '../../../assets/icon.svg'; 

const ChangePasswordForm = () => {
  // 1. Quản lý State của Form (Đồng bộ tên biến với Backend)
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

    // --- Validate cơ bản ---
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

    // --- Gọi API ---
    setIsLoading(true);
    try {
      // Gửi đúng chuẩn snake_case mà Spring Boot yêu cầu
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword
      });

      // Báo thành công & dọn form
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Đăng xuất và điều hướng
      localStorage.removeItem('token'); 
      setTimeout(() => navigate('/login'), 2000);

    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error);
      
      // Xử lý lỗi 401/403 (Token hết hạn/Chưa đăng nhập)
      if (error.response?.status === 401 || error.response?.status === 403) {
         setMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!' });
         localStorage.removeItem('token'); 
         setTimeout(() => navigate('/login'), 2000);
         return;
      }

      // Xử lý các lỗi khác từ Backend (Sai mật khẩu cũ, v.v.)
      const errorMsg = error.response?.data?.message || 'Mật khẩu hiện tại không chính xác hoặc có lỗi xảy ra.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false); 
    }
  };

  // 4. Giao diện (UI)
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img src={logoImg} alt="Fluxboard Logo" className="h-20 w-auto object-contain" />
      </div>

      <h2 className="text-2xl font-bold mb-6 text-center text-black uppercase tracking-wide">
        Đổi Mật Khẩu
      </h2>

      {/* Thông báo */}
      {message.text && (
        <div className={`p-3 mb-4 rounded text-black font-medium border ${
          message.type === 'error' ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mật khẩu hiện tại */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-black"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Nhập mật khẩu hiện tại"
            disabled={isLoading}
          />
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-black"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới (từ 6 ký tự)"
            disabled={isLoading}
          />
        </div>

        {/* Xác nhận mật khẩu mới */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-black"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            disabled={isLoading}
          />
        </div>

        {/* Nút Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 text-white font-bold rounded-md shadow transition-all
            ${isLoading 
              ? 'bg-blue-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:transform active:scale-95'
            }`}
        >
          {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;