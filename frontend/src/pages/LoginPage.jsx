import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { loginSchema } from '../features/auth/schema/auth.schema';
import { Sparkles, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import kanbanInfographicImg from '../assets/Benefits-of-a-Kanban-board-infographic2-2.png';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
    <div className="min-h-screen flex w-full bg-white">
      
        {/* FORM LOGIN */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-md">
          <div className="flex justify-start mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="text-white" size={24} />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-2">Đăng nhập</h2>
          <p className="text-base font-medium text-slate-500 mb-8">Chào mừng bạn quay trở lại với Fluxboard.</p>

          {serverError && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl">
              {serverError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {/* EMAIL */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mt-3 mb-1.5 ml-1">Email</label>
              <input 
                type="text" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full border-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none ${
                  errors.email 
                    ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                    : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                }`}
                placeholder="email@gmail.com"
              />
              {errors.email && (
                <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">{errors.email}</span>
              )}
            </div>
            
            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Mật khẩu</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border-2 pl-4 pr-12 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none ${
                    errors.password 
                      ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                      : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {errors.password && (
                <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">{errors.password}</span>
              )}
            </div>

            <div className="flex justify-between items-center mt-1">
              <Link to="/forgot-password" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Quên mật khẩu?
              </Link>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* HÌNH ẢNH */}
      <div className="hidden lg:flex lg:w-1/3 bg-slate-50 items-center justify-center p-8 border-l border-slate-200">
        <div className="w-full text-center">
          <img 
            src={kanbanInfographicImg} 
            alt="Kanban Benefits" 
            className="w-full h-auto object-contain mix-blend-multiply"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;