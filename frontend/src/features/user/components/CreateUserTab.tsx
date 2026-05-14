import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Lock, Shield, User, Loader2, CheckCircle2 } from 'lucide-react';
import { userApi } from '../api/userApi'; // Điều chỉnh đường dẫn import nếu cần

interface RoleOption {
  id: string;
  name: string;
}

const CreateUserTab: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: '' // Trống mặc định, sẽ tự động lấy ID của Role đầu tiên sau khi gọi API
  });

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 🚀 Tự động tải danh sách Role từ API lúc mới vào trang
useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res: any = await userApi.getRoles();
        
        // 🛠 FIX TRIỆT ĐỂ: Dò tìm mảng dữ liệu (Array) từ JSON Response
        const payload = res.data || res; // Xử lý trường hợp axiosClient dùng interceptor
        const extractedData = payload.content || payload.data || payload; 
        
        // Đảm bảo dữ liệu cuối cùng là một mảng
        const roleData = Array.isArray(extractedData) ? extractedData : [];
        
        setRoles(roleData);
        
        // Gán role mặc định là Role đầu tiên
        if (roleData.length > 0) {
          setFormData(prev => ({ ...prev, role: roleData[0].id }));
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách Role:", error);
        setErrorMsg("Không thể tải danh sách quyền hạn. Vui lòng tải lại trang.");
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear lỗi khi user gõ lại
    if (errorMsg) setErrorMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Rào chắn bảo vệ: Bắt buộc phải có Role ID mới cho gửi
    if (!formData.role) {
      setErrorMsg("Vui lòng chọn quyền hạn cho người dùng.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 🛠 Gói payload bằng chuẩn snake_case để tránh lỗi 400 Bad Request
      const payload = {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role_id: formData.role
      };

      // Gọi API tạo user
      await userApi.createUser(payload);
      
      setSuccessMsg('Tạo tài khoản thành công!');
      
      // Reset form sau khi tạo, nhưng giữ lại cái role đang chọn
      setFormData(prev => ({ fullName: '', email: '', password: '', role: prev.role }));
      
    } catch (error: any) {
      console.error("Lỗi tạo user:", error);
      setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi tạo người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
            <UserPlus className="text-indigo-600" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cấp tài khoản mới</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Tạo tài khoản và phân quyền cho nhân sự mới.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Thông báo */}
          {successMsg && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-bold">
              <CheckCircle2 size={18} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-sm font-bold">
              <Shield size={18} /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <User size={16} className="text-slate-400" /> Họ và tên
              </label>
              <input 
                required
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="VD: Nguyễn Văn A" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail size={16} className="text-slate-400" /> Địa chỉ Email
              </label>
              <input 
                required
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@fluxboard.com" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Lock size={16} className="text-slate-400" /> Mật khẩu khởi tạo
              </label>
              <input 
                required
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)" 
                minLength={6}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700"
              />
            </div>

            {/* DYNAMIC ROLE SELECTOR */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Shield size={16} className="text-slate-400" /> Quyền hạn (Role)
              </label>
              
              <div className="relative">
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isLoadingRoles || roles.length === 0}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700 appearance-none disabled:opacity-50"
                >
                  {isLoadingRoles ? (
                    <option value="">Đang tải danh sách quyền...</option>
                  ) : roles.length > 0 ? (
                    roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Chưa có quyền hạn nào</option>
                  )}
                </select>
                
                {isLoadingRoles && (
                  <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Submit Button */}
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || isLoadingRoles || roles.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-black text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo tài khoản'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateUserTab;