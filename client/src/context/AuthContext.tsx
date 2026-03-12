import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '../lib/api';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user ?? data);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    const tokens = data.tokens ?? data;
    setTokens(
      tokens.accessToken || tokens.access_token,
      tokens.refreshToken || tokens.refresh_token
    );
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', {
      name,
      email,
      password,
    });
    const tokens = data.tokens ?? data;
    setTokens(
      tokens.accessToken || tokens.access_token,
      tokens.refreshToken || tokens.refresh_token
    );
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('iah_refresh_token');
      await api.post('/api/auth/logout', { refreshToken });
    } catch {
      // Best-effort: server-side invalidation may fail if token is expired
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
