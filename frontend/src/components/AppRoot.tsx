'use client';

import React, { Suspense } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { AppNavigationProvider } from './AppNavigation';
import { AppShell } from './AppShell';
import { JiraProvider } from '@/context/JiraContext';
import { Icons } from './Icons';

const Splash: React.FC = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFBFC] gap-4">
    <Icons.JiraLogo className="w-10 h-10" />
    <Icons.Refresh className="w-4 h-4 text-[#0052CC] animate-spin" />
  </div>
);

/** Signed-out visitors see the login page at whatever URL they opened, and land there after logging in. */
const AuthGate: React.FC = () => {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status === 'signed-out') return <LoginPage />;

  return (
    <JiraProvider>
      <AppNavigationProvider>
        <AppShell />
      </AppNavigationProvider>
    </JiraProvider>
  );
};

// useSearchParams (issue in the URL) needs a Suspense boundary. It wraps AuthProvider too, so the
// session check can't change state before this part of the page has hydrated (that would be a mismatch).
export const AppRoot: React.FC = () => (
  <Suspense fallback={<Splash />}>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </Suspense>
);

export default AppRoot;
