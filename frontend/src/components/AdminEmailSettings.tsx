'use client';

import React, { useEffect, useState } from 'react';
import { SmtpSecurity, SmtpSettings, SmtpSettingsInput } from '@/types/jira';
import { saveSmtpSettings, sendSmtpTestEmail } from '@/lib/api';
import { useCurrentUser } from './AuthProvider';
import { Lozenge, fieldClass } from './AdminUi';
import { Icons } from './Icons';

const SECURITY_OPTIONS: { value: SmtpSecurity; label: string; port: number }[] = [
  { value: 'StartTls', label: 'STARTTLS (usually port 587)', port: 587 },
  { value: 'SslOnConnect', label: 'SSL/TLS (usually port 465)', port: 465 },
  { value: 'None', label: 'None, unencrypted (usually port 25)', port: 25 }
];

const PRESETS: { name: string; host: string; port: number; security: SmtpSecurity; username?: string; hint: string }[] = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, security: 'StartTls', hint: 'Use a Google app password (Google Account → Security → App passwords), not your normal password.' },
  { name: 'Microsoft 365', host: 'smtp.office365.com', port: 587, security: 'StartTls', hint: 'SMTP AUTH must be enabled for the mailbox in the Microsoft 365 admin center.' },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, security: 'StartTls', username: 'apikey', hint: 'The username is literally "apikey"; the password is your SendGrid API key.' },
  { name: 'Mailgun', host: 'smtp.mailgun.org', port: 587, security: 'StartTls', hint: 'Use the SMTP login and password from your Mailgun domain settings.' }
];

type Result = { ok: boolean; message: string } | null;

const ResultBanner: React.FC<{ result: Result }> = ({ result }) =>
  result ? (
    <div
      className={`flex items-start gap-2 rounded-[3px] px-3 py-2.5 text-sm ${
        result.ok ? 'bg-[#E3FCEF] text-[#006644]' : 'bg-[#FFEBE6] text-[#BF2600]'
      }`}
    >
      {result.ok ? <Icons.CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Icons.X className="w-4 h-4 mt-0.5 shrink-0" />}
      <span>{result.message}</span>
    </div>
  ) : null;

const Label: React.FC<{ htmlFor: string; children: React.ReactNode; required?: boolean }> = ({ htmlFor, children, required }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold text-[#5E6C84] mb-1">
    {children}
    {required && <span className="text-[#DE350B]"> *</span>}
  </label>
);

interface AdminEmailSettingsProps {
  settings: SmtpSettings;
  onSaved: (settings: SmtpSettings) => void;
}

export default function AdminEmailSettings({ settings, onSaved }: AdminEmailSettingsProps) {
  const me = useCurrentUser();

  const [isEnabled, setIsEnabled] = useState(settings.isEnabled);
  const [host, setHost] = useState(settings.host);
  const [port, setPort] = useState(String(settings.port || 587));
  const [security, setSecurity] = useState<SmtpSecurity>(settings.security || 'StartTls');
  const [username, setUsername] = useState(settings.username ?? '');
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fromAddress, setFromAddress] = useState(settings.fromAddress);
  const [fromName, setFromName] = useState(settings.fromName || 'Jira');
  const [siteUrl, setSiteUrl] = useState(settings.siteUrl);
  const [presetHint, setPresetHint] = useState('');
  const [testTo, setTestTo] = useState(me.emailAddress);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<Result>(null);
  const [testResult, setTestResult] = useState<Result>(null);

  // Links in emails must point at the web app, which is the address this page was opened from
  useEffect(() => {
    if (!settings.siteUrl) setSiteUrl(window.location.origin);
  }, [settings.siteUrl]);

  const formValues = (): SmtpSettingsInput => ({
    isEnabled,
    host: host.trim(),
    port: Number(port) || 0,
    security,
    username: username.trim(),
    password,
    clearPassword,
    fromAddress: fromAddress.trim(),
    fromName: fromName.trim(),
    siteUrl: siteUrl.trim()
  });

  const changeSecurity = (value: SmtpSecurity) => {
    setSecurity(value);
    // Follow the conventional port unless a custom one was entered
    if (SECURITY_OPTIONS.some((o) => String(o.port) === port)) {
      setPort(String(SECURITY_OPTIONS.find((o) => o.value === value)!.port));
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setHost(preset.host);
    setPort(String(preset.port));
    setSecurity(preset.security);
    if (preset.username) setUsername(preset.username);
    setPresetHint(preset.hint);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    try {
      const saved = await saveSmtpSettings(formValues());
      setPassword('');
      setClearPassword(false);
      setSaveResult({
        ok: true,
        message: saved.isReady
          ? 'Email settings saved. Jira will send password reset and invite emails.'
          : 'Email settings saved. Sending is turned off, so users can’t reset forgotten passwords by email.'
      });
      onSaved(saved);
    } catch (err: any) {
      setSaveResult({ ok: false, message: err.message || 'Failed to save email settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await sendSmtpTestEmail({ ...formValues(), to: testTo.trim() });
      setTestResult({ ok: true, message: `${res.message} Check that inbox, including the spam folder.` });
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  const passwordPlaceholder = settings.hasPassword && !clearPassword ? 'Saved. Leave blank to keep it' : '';

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#172B4D]">Email</h1>
            {settings.isReady ? <Lozenge tone="success">Sending on</Lozenge> : <Lozenge tone="warning">Not set up</Lozenge>}
          </div>
          <p className="text-sm text-[#5E6C84] mt-1">
            The mail server Jira uses to send password reset links and account invitations.
          </p>
        </div>
        {settings.updatedAt && (
          <p className="text-xs text-[#7A869A]">
            Last saved{settings.updatedBy ? ` by ${settings.updatedBy}` : ''} on{' '}
            {new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(settings.updatedAt) ? settings.updatedAt : `${settings.updatedAt}Z`).toLocaleString(
              undefined,
              { dateStyle: 'medium', timeStyle: 'short' }
            )}
          </p>
        )}
      </div>

      {settings.passwordUnreadable && (
        <div className="flex items-start gap-2 rounded-[3px] bg-[#FFFAE6] border border-[#FFE380] px-3 py-2.5 text-sm text-[#172B4D]">
          <Icons.Lock className="w-4 h-4 mt-0.5 shrink-0 text-[#974F0C]" />
          <span>The saved SMTP password can&apos;t be decrypted on this server. Enter it again and save.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="border border-[#EBECF0] rounded-[3px] divide-y divide-[#EBECF0]" noValidate>
        {/* Enable */}
        <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#172B4D]">Send email from Jira</div>
            <p className="text-xs text-[#5E6C84] mt-0.5">
              When off, the &quot;Can&apos;t log in?&quot; screen tells users to ask an administrator instead.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            aria-label="Send email from Jira"
            onClick={() => setIsEnabled((v) => !v)}
            className={`relative shrink-0 w-10 h-6 rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-[#36B37E]' : 'bg-[#97A0AF]'}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-4' : ''}`}
            />
          </button>
        </div>

        {/* Server */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#172B4D] mr-1">Mail server</span>
            <span className="text-xs text-[#5E6C84]">Quick fill:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="h-6 px-2 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-xs font-semibold text-[#42526E] cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
          {presetHint && (
            <div className="rounded-[3px] bg-[#DEEBFF] px-3 py-2 text-xs text-[#172B4D]">{presetHint}</div>
          )}

          <div className="grid sm:grid-cols-[1fr_120px] gap-3">
            <div>
              <Label htmlFor="smtp-host" required>SMTP host</Label>
              <input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="smtp-port" required>Port</Label>
              <input
                id="smtp-port"
                inputMode="numeric"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="smtp-security">Connection security</Label>
            <select id="smtp-security" value={security} onChange={(e) => changeSecurity(e.target.value as SmtpSecurity)} className={fieldClass}>
              {SECURITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="smtp-username">Username</Label>
              <input
                id="smtp-username"
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Often your full email address"
                className={fieldClass}
              />
            </div>
            <div>
              <Label htmlFor="smtp-password">Password</Label>
              <div className="relative">
                <input
                  id="smtp-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  disabled={clearPassword}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={passwordPlaceholder}
                  className={`${fieldClass} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-[#42526E] hover:text-[#172B4D] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
              {settings.hasPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setClearPassword((v) => !v);
                    setPassword('');
                  }}
                  className="mt-1 text-xs text-[#0052CC] hover:underline cursor-pointer"
                >
                  {clearPassword ? 'Keep the saved password' : 'Remove the saved password'}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-[#5E6C84] flex items-center gap-1.5">
            <Icons.Lock className="w-3.5 h-3.5 shrink-0" />
            The password is stored encrypted and is never shown again.
          </p>
        </div>

        {/* Sender */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="text-sm font-semibold text-[#172B4D]">Sender</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="smtp-from-name">From name</Label>
              <input id="smtp-from-name" value={fromName} onChange={(e) => setFromName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <Label htmlFor="smtp-from-address" required>From address</Label>
              <input
                id="smtp-from-address"
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="jira@yourcompany.com"
                className={fieldClass}
              />
            </div>
          </div>
          <p className="text-xs text-[#5E6C84]">
            Many providers only deliver mail from an address the account is allowed to send as.
          </p>
        </div>

        {/* Links */}
        <div className="p-4 sm:p-5 space-y-2">
          <Label htmlFor="smtp-site-url" required>Jira site URL</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="smtp-site-url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="http://194.233.85.194:3001"
              className={`${fieldClass} font-mono`}
            />
            <button
              type="button"
              onClick={() => setSiteUrl(window.location.origin)}
              className="h-9 px-3 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#42526E] text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              Use this address
            </button>
          </div>
          <p className="text-xs text-[#5E6C84]">The address people open Jira at. Password reset links in emails point here.</p>
        </div>

        <div className="p-4 sm:p-5 space-y-3 bg-[#FAFBFC]">
          <ResultBanner result={saveResult} />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="h-8 px-4 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save email settings'}
            </button>
          </div>
        </div>
      </form>

      {/* Test */}
      <section className="border border-[#EBECF0] rounded-[3px] p-4 sm:p-5 space-y-3">
        <div>
          <div className="text-sm font-semibold text-[#172B4D]">Send a test email</div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Uses the values in the form above, so you can check them before saving.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="smtp-test-to" className="sr-only">
            Test recipient
          </label>
          <input
            id="smtp-test-to"
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className={fieldClass}
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="h-9 px-3 rounded-[3px] bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {testing ? <Icons.Refresh className="w-4 h-4 animate-spin" /> : <Icons.Mail className="w-4 h-4" />}
            {testing ? 'Sending…' : 'Send test email'}
          </button>
        </div>
        <ResultBanner result={testResult} />
      </section>
    </>
  );
}
