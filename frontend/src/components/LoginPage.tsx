'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { Icons } from './Icons';

const inputClass =
  'w-full h-10 px-2.5 text-sm text-[#172B4D] bg-[#FAFBFC] border-2 border-[#DFE1E6] rounded-[3px] placeholder:text-[#7A869A] hover:bg-[#EBECF0] focus:bg-white focus:border-[#4C9AFF] focus:outline-none transition-colors';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [step, setStep] = useState<'identify' | 'password'>('identify');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === 'identify' ? usernameRef : passwordRef).current?.focus();
  }, [step]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your email or username.');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await signIn(username.trim(), password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Unable to log in.');
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const editUsername = () => {
    setStep('identify');
    setPassword('');
    setError('');
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#FAFBFC] relative">
      <BoardIllustration className="hidden lg:block fixed bottom-0 left-0 w-[340px] xl:w-[400px] pointer-events-none select-none" />
      <ReportIllustration className="hidden lg:block fixed bottom-0 right-0 w-[340px] xl:w-[400px] pointer-events-none select-none" />

      <main className="relative z-10 min-h-full flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[400px] bg-white rounded-[3px] shadow-[0_0_10px_rgba(9,30,66,0.12)] px-6 sm:px-10 pt-8 pb-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2">
            <Icons.JiraLogo className="w-8 h-8" />
            <span className="text-[28px] leading-none font-semibold tracking-tight text-[#253858]">Jira</span>
          </div>

          <h1 className="mt-6 text-center text-base font-semibold text-[#5E6C84]">Log in to continue</h1>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-[3px] bg-[#FFEBE6] px-3 py-2.5 text-[13px] text-[#BF2600]"
            >
              <Icons.X className="w-4 h-4 mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'identify' ? (
            <form onSubmit={handleContinue} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="login-username" className="sr-only">
                  Email or username
                </label>
                <input
                  id="login-username"
                  ref={usernameRef}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your email or username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="mt-5 space-y-4" noValidate>
              {/* Keeps the username in the form so password managers pair it with the password */}
              <div className="flex items-center h-10 px-2.5 bg-[#F4F5F7] border-2 border-[#F4F5F7] rounded-[3px] text-sm text-[#172B4D]">
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  readOnly
                  tabIndex={-1}
                  aria-label="Email or username"
                  className="flex-1 min-w-0 bg-transparent truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={editUsername}
                  className="ml-2 p-1 rounded text-[#42526E] hover:bg-[#DFE1E6] hover:text-[#172B4D] cursor-pointer"
                  title="Change email or username"
                >
                  <Icons.Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#42526E] hover:text-[#172B4D] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-[#172B4D] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm accent-[#0052CC] cursor-pointer"
                />
                Remember me
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] disabled:bg-[#0052CC]/70 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-wait"
              >
                {submitting && <Icons.Refresh className="w-4 h-4 animate-spin" />}
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="text-[#0052CC] hover:underline cursor-pointer"
            >
              Can&apos;t log in?
            </button>
          </div>

          {showHelp && (
            <div className="mt-3 rounded-[3px] bg-[#DEEBFF] px-3 py-2.5 text-[13px] text-[#172B4D] leading-relaxed">
              Ask your Jira administrator to reset your password. Administrators can set a new password from{' '}
              <span className="font-semibold">Settings → Administration → Users</span>.
            </div>
          )}

          <div className="mt-8 pt-5 border-t border-[#DFE1E6] text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-[#253858]">
              <Icons.JiraLogo className="w-4 h-4" />
              <span>JIRA CLONE</span>
            </div>
            <p className="text-[11px] text-[#5E6C84]">One account for all your projects, boards and reports.</p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-[#7A869A]">Self-hosted · .NET 10 + PostgreSQL</p>
      </main>
    </div>
  );
};

const BoardIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 400 340" fill="none" aria-hidden="true">
    <circle cx="110" cy="330" r="200" fill="#DEEBFF" />
    <rect x="48" y="118" width="250" height="176" rx="10" fill="#FFFFFF" stroke="#DFE1E6" strokeWidth="2" />
    <rect x="64" y="134" width="66" height="8" rx="4" fill="#C1C7D0" />
    <rect x="142" y="134" width="66" height="8" rx="4" fill="#C1C7D0" />
    <rect x="220" y="134" width="62" height="8" rx="4" fill="#C1C7D0" />
    <rect x="64" y="154" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="64" y="154" width="4" height="40" rx="2" fill="#0052CC" />
    <rect x="74" y="164" width="44" height="6" rx="3" fill="#97A0AF" />
    <rect x="74" y="176" width="28" height="6" rx="3" fill="#DFE1E6" />
    <rect x="64" y="202" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="64" y="202" width="4" height="40" rx="2" fill="#FFAB00" />
    <rect x="74" y="212" width="38" height="6" rx="3" fill="#97A0AF" />
    <rect x="142" y="154" width="66" height="40" rx="5" fill="#F4F5F7" />
    <rect x="142" y="154" width="4" height="40" rx="2" fill="#6554C0" />
    <rect x="152" y="164" width="46" height="6" rx="3" fill="#97A0AF" />
    <rect x="152" y="176" width="24" height="6" rx="3" fill="#DFE1E6" />
    <rect x="220" y="154" width="62" height="40" rx="5" fill="#F4F5F7" />
    <rect x="220" y="154" width="4" height="40" rx="2" fill="#36B37E" />
    <rect x="230" y="164" width="40" height="6" rx="3" fill="#97A0AF" />
    <circle cx="268" cy="214" r="16" fill="#36B37E" />
    <path d="M260 214l5.5 5.5L276 209" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="24" y="250" width="70" height="44" rx="6" fill="#0052CC" />
    <rect x="34" y="262" width="40" height="6" rx="3" fill="#4C9AFF" />
    <rect x="34" y="274" width="26" height="6" rx="3" fill="#4C9AFF" />
  </svg>
);

const ReportIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 400 340" fill="none" aria-hidden="true">
    <circle cx="290" cy="330" r="200" fill="#E3FCEF" />
    <rect x="100" y="110" width="250" height="180" rx="10" fill="#FFFFFF" stroke="#DFE1E6" strokeWidth="2" />
    <rect x="118" y="128" width="90" height="8" rx="4" fill="#C1C7D0" />
    <rect x="128" y="226" width="22" height="46" rx="3" fill="#B3D4FF" />
    <rect x="162" y="204" width="22" height="68" rx="3" fill="#4C9AFF" />
    <rect x="196" y="186" width="22" height="86" rx="3" fill="#0052CC" />
    <rect x="230" y="214" width="22" height="58" rx="3" fill="#79E2F2" />
    <rect x="264" y="172" width="22" height="100" rx="3" fill="#00B8D9" />
    <path d="M124 196l38-22 34 10 34-26 34 8 34-24" stroke="#FF5630" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="300" cy="134" r="12" fill="#FFAB00" />
    <circle cx="322" cy="134" r="12" fill="#6554C0" />
    <rect x="296" y="236" width="80" height="48" rx="6" fill="#36B37E" />
    <rect x="306" y="248" width="44" height="6" rx="3" fill="#ABF5D1" />
    <rect x="306" y="260" width="28" height="6" rx="3" fill="#ABF5D1" />
  </svg>
);

export default LoginPage;
