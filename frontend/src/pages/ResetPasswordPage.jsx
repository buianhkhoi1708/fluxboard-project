import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { LockKeyhole, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  // Lấy token từ URL xuống
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Các trạng thái của trang
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const { verifyResetToken, resetPassword, isLoading } = useAuthStore();

  // Chạy tự động ngay khi vừa load trang
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        setStatus({ type: 'error', message: 'Không tìm thấy mã xác thực trong đường dẫn.' });
        return;
      }

      // Gọi Backend kiểm tra token
      const result = await verifyResetToken(token);
      setIsVerifying(false);
      
      if (result.success) {
        setIsValidToken(true); // Mở khóa cho phép hiện form
      } else {
        setIsValidToken(false);
        setStatus({ type: 'error', message: result.message });
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    // Kiểm tra sơ bộ ở Frontend
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    
    // Gửi token đang giấu kín và mật khẩu mới xuống Backend
    const result = await resetPassword(token, password);
    if (result.success) {
      setStatus({ type: 'success', message: result.message });
    } else {
      setStatus({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 z-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <LockKeyhole className="text-white" size={28} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-8">Đặt lại mật khẩu</h2>

        {/* Đang kiểm tra token */}
        {isVerifying && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
            <p className="text-sm font-medium text-slate-500">Đang kiểm tra tính hợp lệ của đường dẫn...</p>
          </div>
        )}

        {/* Đã xử lý xong (Thành công hoặc Lỗi Token) */}
        {!isVerifying && status.type && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${status.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            {status.type === 'success' ? (
              <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            ) : (
              <XCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
            )}
            <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {status.message}
            </p>
          </div>
        )}

        {/* Token hợp lệ và chưa đổi pass xong -> Hiện form */}
        {!isVerifying && isValidToken && status.type !== 'success' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Mật khẩu mới</label>
              <input 
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100/50 border-none px-4 py-3 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="Nhập tối thiểu 6 ký tự"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Xác nhận mật khẩu</label>
              <input 
                type="password" required minLength={6} value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-100/50 border-none px-4 py-3 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="mt-4 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Xác nhận đổi mật khẩu</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Nút điều hướng (sẽ hiện khi đổi thành công hoặc token lỗi) */}
        {!isVerifying && (!isValidToken || status.type === 'success') && (
          <div className="mt-6 text-center">
            <Link to={status.type === 'success' ? "/login" : "/forgot-password"} className="inline-flex items-center justify-center w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors">
              {status.type === 'success' ? "Về trang Đăng nhập" : "Gửi lại email khôi phục"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;