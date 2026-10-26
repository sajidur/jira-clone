'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AuthAlert, AuthLayout, authInputClass, authPrimaryButtonClass } from './AuthLayout';
import { Icons } from './Icons';
import { ResetLinkInfo, resetPassword, validateResetLink } from '@/lib/auth';

const MIN_PASSWORD_LENGTH = 8;

function passwordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1);
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

const STRENGTH_COLORS = ['bg-[#DE350B]', 'bg-[#DE350B]', 'bg-[#FFAB00]', 'bg-[#36B37E]', 'bg-[#00875A]'];

export const ResetPasswordPage: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'invalid' | 'ready'>('checking');
  const [token, setToken] = useState('');
  const [info, setInfo] = useState<ResetLinkInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const linkToken = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(linkToken);
    if (!linkToken) {
      setStatus('invalid');
      return;
    }
    validateResetLink(linkToken)
      .then((result) => {
        setInfo(result);
        setStatus(result ? 'ready' : 'invalid');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('invalid');
      });
  }, []);

  useEffect(() => {
    if (status === 'ready') passwordRef.current?.focus();
  }, [status]);

  const strength = passwordStrength(password);
  const isInvite = info?.purpose === 'invite';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(token, password);
      window.location.replace(`/?reset=done&email=${encodeURIComponent(info!.email)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to change your password.');
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <AuthLayout>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#5E6C84]">
          <Icons.Refresh className="w-4 h-4 animate-spin text-[#0052CC]" />
          Checking your link…
        </div>
      </AuthLayout>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthLayout>
        <h1 className="mt-6 text-center text-base font-semibold text-[#5E6C84]">This link has expired</h1>
        {error ? (
          <AuthAlert tone="error">{error}</AuthAlert>
        ) : (
          <p className="mt-4 text-center text-sm text-[#172B4D] leading-relaxed">
            Password links expire and can only be used once. Request a new one and we&apos;ll email it to you.
          </p>
        )}
        <div className="mt-6 space-y-3">
          <a href="/?view=forgot" className={authPrimaryButtonClass}>
            Request a new link
          </a>
          <div className="text-center text-sm">
            <a href="/" className="text-[#0052CC] hover:underline">
              Return to log in
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="mt-6 text-center text-base font-semibold text-[#5E6C84]">
        {isInvite ? 'Choose your password' : 'Choose a new password'}
      </h1>
      <p className="mt-2 text-center text-sm text-[#172B4D]">
        {isInvite ? `Welcome, ${info!.displayName}. ` : ''}For <span className="font-semibold break-all">{info!.email}</span>
      </p>

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
        {/* Lets password managers save the new password against the right account */}
        <input type="text" autoComplete="username" value={info!.email} readOnly hidden />

        <div>
          <div className="relative">
            <label htmlFor="new-password" className="sr-only">
              New password
            </label>
            <input
              id="new-password"
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#42526E] hover:text-[#172B4D] cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-1 rounded-full ${bar <= Math.max(strength.score, 1) ? STRENGTH_COLORS[strength.score] : 'bg-[#DFE1E6]'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-[#5E6C84] w-16 text-right">{strength.label}</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="sr-only">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
          />
        </div>

        <p className="text-xs text-[#5E6C84]">
          Use at least {MIN_PASSWORD_LENGTH} characters. You&apos;ll be signed out of Jira on all other devices.
        </p>

        <button type="submit" disabled={submitting} className={authPrimaryButtonClass}>
          {submitting && <Icons.Refresh className="w-4 h-4 animate-spin" />}
          {submitting ? 'Saving…' : isInvite ? 'Set password' : 'Save new password'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <a href="/" className="text-[#0052CC] hover:underline">
          Return to log in
        </a>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
