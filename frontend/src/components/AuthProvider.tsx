'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser } from '@/types/jira';
import {
  UNAUTHORIZED_EVENT,
  clearAuthToken,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout
} from '@/lib/auth';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  user: AppUser | null;
  isAdmin: boolean;
  signIn: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AppUser | null>(null);

  const applyUser = (u: AppUser | null) => {
    setUser(u);
    setStatus(u ? 'signed-in' : 'signed-out');
  };

  const refreshUser = useCallback(async () => {
    try {
      applyUser(await fetchCurrentUser());
    } catch {
      applyUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Any API call rejected with 401 means the session expired or was revoked
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthToken();
      applyUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const signIn = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    applyUser(await apiLogin(username, password, rememberMe));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      applyUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        isAdmin: !!user && user.role === 'Administrator',
        signIn,
        signOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** The signed-in user. Only use inside the authenticated part of the app. */
export function useCurrentUser(): AppUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without a signed-in user');
  return user;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
