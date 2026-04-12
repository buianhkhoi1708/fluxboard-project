import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/useAuthStore';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      navigate('/board'); // Đăng nhập thành công thì phi thẳng vào Board
    } else {
      setError(result.message);
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
        
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Đăng nhập Fluxboard</h2>
        <p className="text-sm font-medium text-slate-500 text-center mb-8">Chào mừng bạn quay trở lại không gian làm việc</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 ml-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100/50 border-none px-4 py-3 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              placeholder="email@gmail.com"
            />
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
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
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