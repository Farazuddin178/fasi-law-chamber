import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login_log_id: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loginLogId, setLoginLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('current_user');
    const savedLoginLogId = localStorage.getItem('login_log_id');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoginLogId(savedLoginLogId);
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { email, password }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error.message);
      }

      const userData = data.data.user;
      const logId = data.data.login_log_id;

      setUser(userData);
      setLoginLogId(logId);
      localStorage.setItem('current_user', JSON.stringify(userData));
      localStorage.setItem('login_log_id', logId);

      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user && loginLogId) {
        await supabase.functions.invoke('auth-logout', {
          body: {
            user_id: user.id,
            login_log_id: loginLogId
          }
        });
      }

      setUser(null);
      setLoginLogId(null);
      localStorage.removeItem('current_user');
      localStorage.removeItem('login_log_id');

      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data);
        localStorage.setItem('current_user', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login_log_id: loginLogId,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
