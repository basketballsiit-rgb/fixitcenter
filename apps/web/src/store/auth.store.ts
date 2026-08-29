'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, LoginCredentials } from '@/lib/api';

// 12 Hours in milliseconds
export const MAX_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

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
  lastActivityTime: number | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  recordActivity: () => boolean; // Returns false if expired and logged out
  checkIdleTimeout: () => boolean; // Returns true if session is valid, false if expired
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivityTime: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          const { access_token, user } = response.data;
          const userObj: User = {
            ...user,
            name: user.name || user.fullName || user.username,
          };
          const now = Date.now();
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('last_active_time', now.toString());
          }
          set({
            user: userObj,
            accessToken: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastActivityTime: now,
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
          localStorage.removeItem('last_active_time');
        }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          error: null,
          lastActivityTime: null,
        });
      },

      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),

      recordActivity: () => {
        const state = get();
        if (!state.isAuthenticated) return false;

        const now = Date.now();
        const last = state.lastActivityTime;

        // If no timestamp recorded yet, initialize now
        if (!last) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_active_time', now.toString());
          }
          set({ lastActivityTime: now });
          return true;
        }

        // Check if exceeded 12 hours of inactivity
        if (now - last > MAX_IDLE_TIMEOUT_MS) {
          state.logout();
          return false;
        }

        // Throttle updates: update timestamp at most once every 30 seconds
        if (now - last > 30000) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_active_time', now.toString());
          }
          set({ lastActivityTime: now });
        }
        return true;
      },

      checkIdleTimeout: () => {
        const state = get();
        if (!state.isAuthenticated) return true;

        const now = Date.now();
        const last = state.lastActivityTime;

        // If no timestamp recorded yet (e.g. fresh hydration or legacy session), initialize safely
        if (!last) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_active_time', now.toString());
          }
          set({ lastActivityTime: now });
          return true;
        }

        if (now - last > MAX_IDLE_TIMEOUT_MS) {
          state.logout();
          return false;
        }
        return true;
      },
    }),
    {
      name: 'npc-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        lastActivityTime: state.lastActivityTime,
      }),
    }
  )
);
