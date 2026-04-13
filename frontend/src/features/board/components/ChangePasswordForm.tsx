import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 🚀 Đã thêm import navigate
import { authApi } from '../../auth/authApi';
import logoImg from '../../../assets/icon.svg'; 

const ChangePasswordForm = () => {
  // 1. Quản lý State của Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 2. Quản lý UX (Trạng thái loading và thông báo)
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });

  const navigate = useNavigate(); // 🚀 Khởi tạo biến điều hướng

  // 3. Hàm xử lý khi bấm nút Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' }); // Xóa thông báo cũ

    // --- VALIDATE TRƯỚC KHI GỬI API ---
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ các trường!' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    if (oldPassword === newPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại!' });
      return;
    }

    // --- GỌI API ---
    setIsLoading(true);
    try {
      await authApi.changePassword({
        oldPassword: oldPassword,
        newPassword: newPassword
      });

      // 🚀 Báo thành công, xóa token cũ và đá về trang login
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      localStorage.removeItem('token'); // Xóa phiên đăng nhập cũ cho an toàn
      setTimeout(() => navigate('/login'), 2000); // Đợi 2s rồi tự nhảy sang trang đăng nhập

    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error);
      
      // 🚀 Bắt lỗi 401 từ Spring Boot (Chưa gửi Token hoặc Token hết hạn)
      if (error.response?.status === 401 || error.response?.status === 403) {
         setMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!' });
         localStorage.removeItem('token'); 
         setTimeout(() => navigate('/login'), 2000);
         return;
      }

      // Các lỗi khác (ví dụ: sai mật khẩu cũ)
      const errorMsg = error.response?.data?.message || 'Mật khẩu cũ không chính xác hoặc có lỗi xảy ra.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false); 
    }
  };

  // 4. Giao diện (UI) - Đã giữ nguyên 100% thiết kế của bạn
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border border-gray-200">
      
      {/* Hiển thị logo Fluxboard */}
      <div className="flex justify-center mb-6">
        <img 
          src={logoImg} 
          alt="Fluxboard Logo" 
          className="h-20 w-auto object-contain" 
        />
      </div>

      <h2 className="text-2xl font-bold mb-6 text-center text-black uppercase tracking-wide">
        Đổi Mật Khẩu
      </h2>

      {/* Hiển thị thông báo */}
      {message.text && (
        <div className={`p-3 mb-4 rounded text-black font-medium border ${
          message.type === 'error' ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mật khẩu cũ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-black"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
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
            placeholder="Nhập mật khẩu mới (>= 6 ký tự)"
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