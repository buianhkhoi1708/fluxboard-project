import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { forgotPasswordSchema } from '../features/auth/schema/auth.schema';
import { KeyRound, ArrowLeft, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import kanbanInfographicImg from '../assets/Benefits-of-a-Kanban-board-infographic2-2.png';

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
    <div className="min-h-screen flex w-full bg-white">
      {/* FORM QUÊN MẬT KHẨU */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-md">
          <div className="flex justify-start mb-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <KeyRound className="text-white" size={24} />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-2">Quên mật khẩu</h2>
          <p className="text-base font-medium text-slate-500 mb-8">Nhập email đăng nhập để nhận hướng dẫn khôi phục.</p>

          {status.type === 'success' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-semibold text-emerald-800">{status.message}</p>
            </div>
          )}
          
          {status.type === 'error' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <XCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm font-semibold text-rose-800">{status.message}</p>
            </div>
          )}

          {status.type !== 'success' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mt-3 mb-1.5 ml-1">Email của bạn</label>
                <input 
                  type="text" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full border-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all outline-none ${
                    errors.email 
                      ? 'bg-rose-50 border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100' 
                      : 'bg-white border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
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
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

          <div className="mt-8 text-left">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} />
              <span>Quay lại Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>

      {/*HÌNH ẢNH */}
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

export default ForgotPasswordPage;