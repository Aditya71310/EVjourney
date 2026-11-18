import { create } from 'zustand';
import api, { TOKEN_STORAGE_KEY, extractErrorMessage } from '../services/api';
import type { User } from '../types';

type ThemeMode = 'dark' | 'light' | 'system';

interface AuthState {
  user: User | null;
  token: string | null;
  initializing: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<User>;
  logout: () => void;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return mode;
}

function applyThemeToDom(mode: ThemeMode) {
  const effective = resolveTheme(mode);
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
    root.removeAttribute('data-theme');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
  localStorage.setItem('ev_journey_theme', mode);
}

const storedTheme = (localStorage.getItem('ev_journey_theme') as ThemeMode) || 'dark';
applyThemeToDom(storedTheme);

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  initializing: true,
  theme: storedTheme,

  setTheme: (theme) => {
    applyThemeToDom(theme);
    set({ theme });
  },

  setUser: (user) => {
    if (user?.theme) {
      applyThemeToDom(user.theme);
      set({ user, theme: user.theme });
    } else {
      set({ user });
    }
  },

  initializeAuth: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ user: null, token: null, initializing: false });
      return;
    }
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      const user = res.data.user;
      if (user?.theme) {
        applyThemeToDom(user.theme);
      }
      set({ user, token, initializing: false, theme: user.theme || 'dark' });
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({ user: null, token: null, initializing: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      if (res.data.user.theme) {
        applyThemeToDom(res.data.user.theme);
      }
      set({
        user: res.data.user,
        token: res.data.token,
        initializing: false,
        theme: res.data.user.theme || 'dark',
      });
      return res.data.user;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Unable to sign in.'));
    }
  },

  register: async (payload) => {
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/register', payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
      applyThemeToDom('dark');
      set({
        user: res.data.user,
        token: res.data.token,
        initializing: false,
        theme: 'dark',
      });
      return res.data.user;
    } catch (err) {
      throw new Error(extractErrorMessage(err, 'Unable to create account.'));
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ user: null, token: null, initializing: false });
  },
}));
