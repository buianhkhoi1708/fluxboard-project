import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { authApi } from '../../auth/authApi'; 

const passwordSchema = yup.object().shape({
  currentPassword: yup.string().required('Vui lòng nhập mật khẩu hiện tại'),
  newPassword: yup.string()
    .required('Vui lòng nhập mật khẩu mới')
    .matches(
      /^(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Mật khẩu phải từ 8 ký tự, gồm ít nhất 1 chữ hoa và 1 chữ số'
    ),
  confirmPassword: yup.string()
    .required('Vui lòng xác nhận mật khẩu mới')
    .oneOf([yup.ref('newPassword')], 'Mật khẩu xác nhận không khớp'),
});

const ChangePasswordForm = () => {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  
  // State quản lý ẩn/hiện mật khẩu cho từng ô
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const validateRealTime = async () => {
      try {
        await passwordSchema.validate(formData, { abortEarly: false });
        setErrors({}); 
      } catch (err: any) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach((error: any) => {
          newErrors[error.path] = error.message;
        });
        setErrors(newErrors);
      }
    };
    if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
      validateRealTime();
    } else {
      setErrors({});
    }
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerMessage({ type: '', text: '' });

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    try {
      await authApi.changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
        confirm_new_password: formData.confirmPassword
      });
      
      setServerMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển hướng...' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      localStorage.removeItem('token'); 
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
         setServerMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!' });
         localStorage.removeItem('token'); 
         setTimeout(() => navigate('/login'), 2000);
         return;
      }
      setServerMessage({ type: 'error', text: error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!' });
    } finally {
      setIsLoading(false);
    }
  };

  // Component dùng chung cho Icon Con Mắt (Đen & Đậm nét)
  const EyeIcon = ({ isShowing, onClick }: { isShowing: boolean, onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 focus:outline-none"
    >
      {isShowing ? (
        <svg className="w-5 h-5 !text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 !text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="max-w-md animate-fade-in">
      <h2 className="text-2xl font-bold !text-black mb-6">Đổi mật khẩu</h2>
      
      {serverMessage.text && (
        <div className={`p-3 mb-4 rounded-lg text-sm font-bold border border-black bg-gray-100 !text-black`}>
          {serverMessage.type === 'error' ? '⚠ ' : '✔ '} {serverMessage.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mật khẩu cũ */}
        <div>
          <label className="block text-sm font-bold !text-black mb-1">Mật khẩu hiện tại</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none !text-black placeholder-black transition ${errors.currentPassword ? 'border-black focus:ring-black bg-gray-200' : 'border-gray-400 focus:ring-black focus:border-black'}`}
            />
            <EyeIcon isShowing={showCurrent} onClick={() => setShowCurrent(!showCurrent)} />
          </div>
          {errors.currentPassword && <p className="!text-black text-xs mt-1.5 font-bold">⚠ {errors.currentPassword}</p>}
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label className="block text-sm font-bold !text-black mb-1">Mật khẩu mới</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none !text-black placeholder-black transition ${errors.newPassword ? 'border-black focus:ring-black bg-gray-200' : 'border-gray-400 focus:ring-black focus:border-black'}`}
            />
            <EyeIcon isShowing={showNew} onClick={() => setShowNew(!showNew)} />
          </div>
          {errors.newPassword && <p className="!text-black text-xs mt-1.5 font-bold">⚠ {errors.newPassword}</p>}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-sm font-bold !text-black mb-1">Xác nhận mật khẩu</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none !text-black placeholder-black transition ${errors.confirmPassword ? 'border-black focus:ring-black bg-gray-200' : 'border-gray-400 focus:ring-black focus:border-black'}`}
            />
            <EyeIcon isShowing={showConfirm} onClick={() => setShowConfirm(!showConfirm)} />
          </div>
          {errors.confirmPassword && <p className="!text-black text-xs mt-1.5 font-bold">⚠ {errors.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || Object.keys(errors).length > 0}
          className={`w-full mt-2 py-2.5 px-4 !text-black font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 border border-black
            ${(isLoading || Object.keys(errors).length > 0)
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-white hover:bg-gray-200 active:scale-95'
            }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 !text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang xử lý...
            </>
          ) : (
            'Đổi mật khẩu'
          )}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;