import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); //Lỗi sai tk hoặc mk
  const [emailError, setEmailError] = useState(''); // Lỗi định dạng Email
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Kiểm tra định dạng email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setEmailError('');

    // Chặn trước nếu email sai định dạng
    if (!validateEmail(email)) {
      setEmailError('Vui lòng nhập đúng định dạng email');
      return; // Dừng để không gọi API
    }
    
    // Kiểm tra email và mk
    const result = await login(email, password);
    if (result.success) {
      setError('');
      navigate('/board'); // Đăng nhập thành công thì phi thẳng vào Board
    } else {
      setError('Email hoặc mật khẩu không đúng, vui lòng thử lại');
    }
  };

  // Xóa cảnh báo khi người dùng gõ lại email
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  // Khi con trỏ chuột rời khỏi ô nhập Email
  const handleEmailBlur = () => {
    if (email.trim() !== '' && !validateEmail(email)) { 
      setEmailError('Vui lòng nhập đúng định dạng email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 z-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={28} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800! mb-2">Đăng nhập Fluxboard</h2>
        <p className="text-sm font-medium text-slate-500 text-center mb-8">Chào mừng bạn quay trở lại không gian làm việc</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Email</label>
            <input 
              type="text"
              required
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              className={`w-full border px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                emailError 
                  ? 'bg-rose-50 border-rose-300 focus:ring-2 focus:ring-rose-400' 
                  : 'bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500'
              }`}
              placeholder="email@gmail.com"
            />
            {emailError && (
              <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                {emailError}
              </span>
            )}
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Mật khẩu</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100/50 border-none px-4 py-3 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              placeholder="••••••••"
            />
            {/* Khung hiển thị thông báo Sai email hoặc mật khẩu */}
            {error && (
              <div className="p-3 text-rose-600 text-sm font-bold rounded-xl text-left">
                {error}
              </div>
            )}

            <div className="flex justify-start mt-2">
              <Link to="/forgot-password" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Quên mật khẩu
              </Link>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-2 w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <span>Đăng nhập ngay</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;