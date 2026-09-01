import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoUsers: User[];
  isLoading: boolean;
  login: (credential: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, email: string, password: string, avatarUrl?: string) => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;
  refreshDemoUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pulse_token'));
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDemoUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/demo-users');
      if (res.ok) {
        const data = await res.json();
        setDemoUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load demo users', err);
    }
  }, []);

  const loadUser = useCallback(async (jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${jwtToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid
        localStorage.removeItem('pulse_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate with token', err);
      localStorage.removeItem('pulse_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemoUsers();
    if (token) {
      loadUser(token);
    } else {
      // Auto login as first demo user (Alex) if not logged in
      (async () => {
        try {
          const res = await fetch('/api/auth/demo-users');
          if (res.ok) {
            const data = await res.json();
            const list = data.users || [];
            setDemoUsers(list);
            if (list.length > 0) {
              const switchRes = await fetch('/api/auth/switch-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: list[0].id })
              });
              if (switchRes.ok) {
                const switchData = await switchRes.json();
                localStorage.setItem('pulse_token', switchData.token);
                setToken(switchData.token);
                setUser(switchData.user);
              }
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [fetchDemoUsers, loadUser, token]);

  const switchDemoUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) throw new Error('Failed to switch user');
      const data = await res.json();
      localStorage.setItem('pulse_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credential: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, password })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('pulse_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (username: string, displayName: string, email: string, password: string, avatarUrl?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, email, password, avatarUrl })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('pulse_token', data.token);
    setToken(data.token);
    setUser(data.user);
    fetchDemoUsers();
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!token) return;
    const res = await fetch('/api/users/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const result = await res.json();
    setUser(result.user);
    fetchDemoUsers();
  };

  const logout = () => {
    localStorage.removeItem('pulse_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoUsers,
        isLoading,
        login,
        register,
        switchDemoUser,
        updateProfile,
        logout,
        refreshDemoUsers: fetchDemoUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
