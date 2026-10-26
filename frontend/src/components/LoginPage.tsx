'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { AuthAlert, AuthLayout, authInputClass, authPrimaryButtonClass } from './AuthLayout';
import { Icons } from './Icons';
import { requestPasswordReset } from '@/lib/auth';

type Step = 'identify' | 'password' | 'forgot' | 'sent';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>('identify');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const recoveryRef = useRef<HTMLInputElement>(null);

  // Links from emails land here: /?view=forgot (expired link) or /?reset=done&email=… (password changed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'forgot') {
      setStep('forgot');
    } else if (params.get('reset') === 'done') {
      setUsername(params.get('email') ?? '');
      setStep(params.get('email') ? 'password' : 'identify');
      setNotice('Your password has been changed. Log in with your new password.');
    }
    if (params.toString()) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    const target = { identify: usernameRef, password: passwordRef, forgot: recoveryRef, sent: null }[step];
    target?.current?.focus();
  }, [step]);

  const goTo = (next: Step) => {
    setError('');
    setNotice('');
    setStep(next);
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your email or username.');
      return;
    }
    goTo('password');
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

  const openForgot = () => {
    if (!recoveryEmail && username.includes('@')) setRecoveryEmail(username.trim());
    goTo('forgot');
  };

  const sendRecoveryLink = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!recoveryEmail.trim()) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await requestPasswordReset(recoveryEmail.trim());
      if (step === 'sent') setNotice('We sent another recovery link.');
      setStep('sent');
    } catch (err: any) {
      setError(err.message || 'Unable to send a recovery link.');
    } finally {
      setSubmitting(false);
    }
  };

  const heading = {
    identify: 'Log in to continue',
    password: 'Log in to continue',
    forgot: "Can't log in?",
    sent: 'Check your inbox to log in'
  }[step];

  return (
    <AuthLayout>
      <h1 className="mt-6 text-center text-base font-semibold text-[#5E6C84]">{heading}</h1>

      {notice && <AuthAlert tone="success">{notice}</AuthAlert>}
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      {step === 'identify' && (
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
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authPrimaryButtonClass}>
            Continue
          </button>
        </form>
      )}

      {step === 'password' && (
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
              onClick={() => {
                setPassword('');
                goTo('identify');
              }}
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
              className={`${authInputClass} pr-10`}
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

          <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
            {submitting && <Icons.Refresh className="w-4 h-4 animate-spin" />}
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      )}

      {step === 'forgot' && (
        <form onSubmit={sendRecoveryLink} className="mt-5 space-y-4" noValidate>
          <label htmlFor="recovery-email" className="block text-xs font-semibold text-[#5E6C84]">
            We&apos;ll send a recovery link to
          </label>
          <input
            id="recovery-email"
            ref={recoveryRef}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Enter your email address"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            className={`${authInputClass} -mt-2`}
          />
          <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
            {submitting && <Icons.Refresh className="w-4 h-4 animate-spin" />}
            {submitting ? 'Sending…' : 'Send recovery link'}
          </button>
        </form>
      )}

      {step === 'sent' && (
        <div className="mt-5 text-center space-y-4">
          <EnvelopeIllustration />
          <p className="text-sm text-[#172B4D] leading-relaxed">
            We sent a recovery link to you at
            <br />
            <span className="font-semibold break-all">{recoveryEmail.trim()}</span>
          </p>
          <p className="text-xs text-[#5E6C84] leading-relaxed">
            The link expires in 1 hour. Didn&apos;t get it? Check your spam folder, or make sure you used the email
            address on your Jira account.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2 text-sm">
        {step === 'identify' || step === 'password' ? (
          <button type="button" onClick={openForgot} className="text-[#0052CC] hover:underline cursor-pointer">
            Can&apos;t log in?
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => goTo(username ? 'password' : 'identify')}
              className="text-[#0052CC] hover:underline cursor-pointer"
            >
              Return to log in
            </button>
            {step === 'sent' && (
              <>
                <span className="text-[#7A869A]">•</span>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => sendRecoveryLink()}
                  className="text-[#0052CC] hover:underline cursor-pointer disabled:opacity-60"
                >
                  Resend recovery link
                </button>
              </>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
};

const EnvelopeIllustration: React.FC = () => (
  <svg className="mx-auto w-28 h-20" viewBox="0 0 112 80" fill="none" aria-hidden="true">
    <rect x="10" y="14" width="92" height="60" rx="6" fill="#DEEBFF" />
    <rect x="16" y="6" width="80" height="52" rx="4" fill="#FFFFFF" stroke="#DFE1E6" strokeWidth="2" />
    <rect x="28" y="18" width="40" height="5" rx="2.5" fill="#C1C7D0" />
    <rect x="28" y="28" width="56" height="5" rx="2.5" fill="#DFE1E6" />
    <rect x="28" y="38" width="30" height="8" rx="2" fill="#0052CC" />
    <path d="M10 30l46 28 46-28v38a6 6 0 01-6 6H16a6 6 0 01-6-6V30z" fill="#4C9AFF" />
    <path d="M10 74l38-26M102 74L64 48" stroke="#2684FF" strokeWidth="2" />
  </svg>
);

export default LoginPage;
