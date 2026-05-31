import { create } from 'zustand';
import axiosClient from '../../../lib/axiosClient';

export interface UserProfile {
  id: string | number;
  user_id?: string | number;
  email: string;
  full_name: string;
  fullName?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  department?: string | null;
  system_role?: string;
  role_id?: string;
  roleId?: string;
  role?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => boolean;

  forgotPassword: (email: string) => Promise<any>;
  verifyResetToken: (token: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;

  updateUserProfile: (updatedData: Partial<UserProfile>) => void;
}

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const unwrapApiResponse = (res: any) => {
  if (!res) return null;
  if (res.data?.data) return res.data.data;
  if (res.data) return res.data;
  return res;
};

const normalizeUser = (payload: any): UserProfile => {
  const user = payload.user || payload;

  return {
    ...user,
    id: user.id || user.user_id || payload.userId || payload.user_id,
    user_id: user.user_id || user.id || payload.userId || payload.user_id,
    email: user.email || payload.email || '',
    full_name: user.full_name || user.fullName || payload.fullName || payload.full_name || user.email || payload.email || 'Người dùng',
    avatar_url: user.avatar_url || user.avatarUrl || null,
    role_id: user.role_id || user.roleId || payload.roleId || payload.role_id,
    role: user.role || payload.role || payload.roleName || payload.role_name,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: readStoredUser(),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/login', { email, password });
      const payload = unwrapApiResponse(res);

      const accessToken =
        payload?.accessToken ||
        payload?.access_token ||
        payload?.token ||
        payload?.access;

      if (!accessToken) {
        set({ isLoading: false });
        return { success: false, message: 'Backend không trả về access token.' };
      }

      const user = normalizeUser(payload);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ token: accessToken, user, isLoading: false });
      return { success: true };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || 'Đăng nhập thất bại!',
      };
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/forgot-password', { email });
      const payload = unwrapApiResponse(res);

      set({ isLoading: false });
      return { success: true, message: payload?.message || res?.message || 'Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.' };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.',
      };
    }
  },

  verifyResetToken: async (token: string) => {
    try {
      await axiosClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.',
      };
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    set({ isLoading: true });

    try {
      const res: any = await axiosClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });

      set({ isLoading: false });
      return { success: true, message: res?.message || 'Đổi mật khẩu thành công!' };
    } catch (error: any) {
      set({ isLoading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Có lỗi xảy ra.',
      };
    }
  },

  updateUserProfile: (updatedData) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const newUser = { ...currentUser, ...updatedData };
    localStorage.setItem('user', JSON.stringify(newUser));
    set({ user: newUser });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
    window.dispatchEvent(new Event('auth:logout'));
    window.location.href = '/login';
  },

  checkAuth: () => {
    const token = get().token || localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (!payload?.exp || payload.exp * 1000 < Date.now()) {
        get().logout();
        return false;
      }

      return true;
    } catch {
      get().logout();
      return false;
    }
  },
}));

window.addEventListener('auth:unauthorized', () => {
  useAuthStore.setState({ token: null, user: null, isLoading: false });
});