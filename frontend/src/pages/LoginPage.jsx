import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { loginSchema } from '../features/auth/schema/auth.schema';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Xử lý khi gõ phím -> Xóa lỗi của field đó
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Xử lý khi con trỏ rời khỏi ô nhập -> Check lỗi từng ô (validateAt)
  const handleBlur = async (e) => {
    const { name } = e.target;
    try {
      await loginSchema.validateAt(name, formData);
      setErrors((prev) => ({ ...prev, [name]: '' }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [name]: err.message }));
    }
  };

  // Xử lý khi bấm Đăng nhập -> Check lỗi toàn bộ (abortEarly: false)
  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    try {
      // Xác thực toàn bộ form
      await loginSchema.validate(formData, { abortEarly: false });
      
      // Nếu không có lỗi thì gọi API Backend
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setServerError('');
        navigate('/board'); 
      } else {
        setServerError('Sai email hoặc mật khẩu');
      }
    } catch (err) {
      // Gom tất cả lỗi từ Yup ném vào state errors
      const validationErrors = {};
      err.inner.forEach((error) => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 z-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={28} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Đăng nhập Fluxboard</h2>
        <p className="text-sm font-medium text-slate-500 text-center mb-8">Chào mừng bạn quay trở lại không gian làm việc</p>

        {serverError && (
          <div className="mt-2 mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl text-center">
            {serverError}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* EMAIL */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Email</label>
            <input 
              type="text" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                errors.email 
                  ? 'bg-rose-50 border-rose-300 focus:ring-2 focus:ring-rose-400' 
                  : 'bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500'
              }`}
              placeholder="email@gmail.com"
            />
            {errors.email && (
              <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                {errors.email}
              </span>
            )}
          </div>
          
          {/* PASSWORD */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Mật khẩu</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full border px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                errors.password 
                  ? 'bg-rose-50 border-rose-300 focus:ring-2 focus:ring-rose-400' 
                  : 'bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500'
              }`}
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                {errors.password}
              </span>
            )}
          </div>

          <div className="flex justify-start mt-2">
            <Link to="/forgot-password" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              Quên mật khẩu
            </Link>
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