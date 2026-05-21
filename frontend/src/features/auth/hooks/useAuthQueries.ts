import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../lib/axiosClient';

// ===============================
// 1. USER INTERFACE
// ===============================
export interface UserProfile {
  id: string | number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  department?: string | null;
  system_role?: string;
  role_id?: string;
}

export const AUTH_KEYS = {
  me: ['auth', 'me'] as const,
};

// ===============================
// 2. QUERY: QUẢN LÝ USER STATE TRONG CACHE
// ===============================
export const useAuthUser = () => {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: (): UserProfile | null => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!storedUser || !token) return null;

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

// ===============================
// 3. MUTATIONS: LOGIC TRẢ VỀ { SUCCESS } GIỮ NGUYÊN BẢN CŨ
// ===============================

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // 🚀 CHÌA KHÓA: Nhận 1 Object thay vì mảng, chuẩn với style của TanStack
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      try {
        const res: any = await axiosClient.post('/auth/login', { email, password });
        
        const payload = res.data || res;
        const finalAccessToken = payload.accessToken || payload.access_token;
        const finalUser = payload.user || payload;

        if (!finalAccessToken) {
          console.error("🔴 CẢNH BÁO: Không tìm thấy Access Token!");
        }

        const normalizedUser: UserProfile = {
          ...finalUser,
          id: finalUser.id || finalUser.user_id
        };

        localStorage.setItem('token', finalAccessToken);
        localStorage.setItem('user', JSON.stringify(normalizedUser));

        queryClient.setQueryData(AUTH_KEYS.me, normalizedUser);

        // Trả về đúng object success: true để UI chạy tiếp mạch logic
        return { success: true };

      } catch (error: any) {
        // Tự bắt lỗi và trả về success: false, ngăn TanStack ném lỗi làm sập UI
        return {
          success: false,
          message: error.response?.data?.message || 'Đăng nhập thất bại!'
        };
      }
    }
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      try {
        const res: any = await axiosClient.post('/auth/forgot-password', { email });
        return { success: true, message: res.message || 'Đã gửi yêu cầu.' };
      } catch (error: any) {
        return {
          success: false,
          message: error.response?.data?.message || 'Lỗi hệ thống.'
        };
      }
    }
  });
};

export const useVerifyResetToken = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      try {
        await axiosClient.get(`/auth/verify-reset-token?token=${token}`);
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          message: error.response?.data?.message || 'Token không hợp lệ.'
        };
      }
    }
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      try {
        const res: any = await axiosClient.post('/auth/reset-password', {
          token,
          new_password: newPassword
        });
        return { success: true, message: res.message || 'Đổi mật khẩu thành công!' };
      } catch (error: any) {
        return {
          success: false,
          message: error.response?.data?.message || 'Có lỗi xảy ra.'
        };
      }
    }
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    onSuccess: () => {
      queryClient.removeQueries();
      window.location.href = '/login';
    }
  });
};

export const useUpdateLocalProfile = () => {
  const queryClient = useQueryClient();

  return (updatedData: Partial<UserProfile>) => {
    queryClient.setQueryData(AUTH_KEYS.me, (oldUser: UserProfile | undefined) => {
      const stored = localStorage.getItem('user');
      const currentUser = oldUser || (stored ? JSON.parse(stored) : null);
      
      if (currentUser) {
        const newUser = { ...currentUser, ...updatedData };
        localStorage.setItem('user', JSON.stringify(newUser));
        return newUser;
      }
      return oldUser;
    });
  };
};