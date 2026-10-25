import { AppUser } from '@/types/jira';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

const TOKEN_KEY = 'jira_auth_token';

// Fired when the API rejects the stored session, so the app can return to the login screen
export const UNAUTHORIZED_EVENT = 'jira:unauthorized';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function storeAuthToken(token: string, remember: boolean) {
  clearAuthToken();
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {}
}

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && token && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return res;
}

// For plain links (file downloads) that can't send an Authorization header
export function withAccessToken(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  return `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
}

export async function login(username: string, password: string, rememberMe: boolean): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, rememberMe })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) throw new Error('Too many login attempts. Wait a minute and try again.');
    throw new Error(data.message || 'Unable to log in. Please try again.');
  }
  storeAuthToken(data.token, rememberMe);
  return data.user;
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<AppUser | null> {
  if (!getAuthToken()) return null;
  const res = await authFetch(`${API_BASE}/api/auth/me`, { cache: 'no-store' });
  if (res.status === 401) {
    clearAuthToken();
    return null;
  }
  if (!res.ok) throw new Error('Failed to load your account');
  return res.json();
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
  } finally {
    clearAuthToken();
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to change password');
  }
}
