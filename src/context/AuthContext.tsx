'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { updateSessionDatabase, destroySession } from '@/actions/session';
import { loginUser } from '@/actions/auth';

// Session timeout: 30 minutes
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface UserDatabase {
  code: string;
  database_name: string;
  name: string;
}

export interface User {
  user_code: string;
  user_name: string;
  user_level: number;
  provider: string;
  data_group: string;
  selected_database?: string;
  selected_database_name?: string;
  customer_code?: string;  // รหัสลูกค้าของผู้ใช้ (optional)
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  availableDatabases: UserDatabase[];
  login: (provider: string, dataGroup: string, username: string, password: string) => Promise<{ success: boolean; message: string; needSelectDatabase?: boolean }>;
  selectDatabase: (database: UserDatabase) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes
const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [availableDatabases, setAvailableDatabases] = useState<UserDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const router = useRouter();
  const pathname = usePathname();

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('pricechecker_user');
    const savedDatabases = localStorage.getItem('pricechecker_databases');
    
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedDatabases) {
          setAvailableDatabases(JSON.parse(savedDatabases));
        }
      } catch {
        localStorage.removeItem('pricechecker_user');
        localStorage.removeItem('pricechecker_databases');
      }
    }
    setIsLoading(false);
  }, []);

  // Session timeout checker
  useEffect(() => {
    if (!user) return;

    const checkSession = () => {
      if (Date.now() - lastActivity >= SESSION_TIMEOUT_MS) {
        performLogout();
      }
    };

    const interval = setInterval(checkSession, 60000);
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  // Activity listener
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
    };
  }, [user, updateActivity]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

    if (!user && !isPublicRoute) {
      router.push('/login');
    } else if (user && !user.selected_database && pathname !== '/select-database' && !isPublicRoute) {
      router.push('/select-database');
    }
  }, [user, pathname, isLoading, router]);

  const performLogout = async () => {
    await destroySession();
    setUser(null);
    setAvailableDatabases([]);
    localStorage.removeItem('pricechecker_user');
    localStorage.removeItem('pricechecker_databases');
    router.push('/login');
  };

  const login = async (provider: string, dataGroup: string, username: string, password: string) => {
    try {
      const result = await loginUser(provider, dataGroup, username, password);

      if (result.success && result.user) {
        const userData: User = {
          user_code: result.user.user_code,
          user_name: result.user.user_name,
          user_level: result.user.user_level || 0,
          provider,
          data_group: dataGroup,
        };
        
        setUser(userData);
        setAvailableDatabases(result.databases || []);
        setLastActivity(Date.now());
        
        localStorage.setItem('pricechecker_user', JSON.stringify(userData));
        localStorage.setItem('pricechecker_databases', JSON.stringify(result.databases || []));
        
        return { 
          success: true, 
          message: 'Login successful', 
          needSelectDatabase: (result.databases?.length || 0) > 0 
        };
      }
      
      return { success: false, message: result.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่' };
    }
  };

  const selectDatabase = async (database: UserDatabase) => {
    if (!user) return;

    const result = await updateSessionDatabase(database.database_name, database.name);

    if (result.success) {
      const updatedUser = {
        ...user,
        selected_database: database.database_name,
        selected_database_name: database.name,
      };
      setUser(updatedUser);
      localStorage.setItem('pricechecker_user', JSON.stringify(updatedUser));
      router.push('/');
    } else {
      console.error('Failed to select database:', result.error);
    }
  };

  const logout = () => {
    performLogout();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      availableDatabases, 
      login, 
      selectDatabase, 
      logout 
    }}>
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
