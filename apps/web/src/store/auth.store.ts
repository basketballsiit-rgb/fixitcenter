'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, LoginCredentials } from '@/lib/api';

interface User {
  id: string;
  username: string;
  fullName?: string;
  name?: string;
  role: string;
  centerId?: string;
  centerName?: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          const { access_token, user } = response.data;
          const userObj: User = {
            ...user,
            name: user.name || user.fullName || user.username,
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', access_token);
          }
          set({
            user: userObj,
            accessToken: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน';
          set({ isLoading: false, error: message, isAuthenticated: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'npc-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
