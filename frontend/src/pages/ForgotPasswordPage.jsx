import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { forgotPasswordSchema } from '../features/auth/schema/auth.schema';
import { KeyRound, ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const { forgotPassword, isLoading } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = async (e) => {
    const { name } = e.target;
    try {
      await forgotPasswordSchema.validateAt(name, formData);
      setErrors(prev => ({ ...prev, [name]: '' }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [name]: err.message }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setStatus({ type: '', message: '' });
    setErrors({});

    try {
      await forgotPasswordSchema.validate(formData, { abortEarly: false });
      
      const result = await forgotPassword(formData.email);
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: 'Đường dẫn khôi phục mật khẩu đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra!' 
        });
      } else {
        setStatus({ type: 'error', message: result.message });
      }
    } catch (err) {
      const validationErrors = {};
      err.inner.forEach(error => {
        validationErrors[error.path] = error.message;
      });
      setErrors(validationErrors);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/20 blur-[120px]"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 z-10">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <KeyRound className="text-white" size={28} />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-center text-slate-800">Quên mật khẩu</h2>
        <p className="text-sm font-medium text-slate-500 text-center">Nhập email đăng nhập để nhận hướng dẫn khôi phục.</p>

        {status.type === 'success' && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 mt-4">
            <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium text-emerald-700">{status.message}</p>
          </div>
        )}
        
        {status.type === 'error' && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl text-center mt-4">
            {status.message}
          </div>
        )}

        {status.type !== 'success' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Email của bạn</label>
              <input 
                type="text" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full border px-4 py-3 rounded-xl text-sm font-semibold transition-all outline-none ${
                  errors.email 
                    ? 'bg-rose-50 border-rose-300 focus:ring-2 focus:ring-rose-400' 
                    : 'bg-slate-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-emerald-500'
                }`}
                placeholder="email@gmail.com"
              />
              {errors.email && (
                <span className="text-xs font-bold text-rose-500 mt-1.5 ml-1 block">
                  {errors.email}
                </span>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="mt-2 w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Gửi link khôi phục</span>
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;