/**
 * API Client for NestJS Backend
 *
 * Wraps fetch with JWT auth and base URL configuration.
 * Stores JWT in localStorage and attaches to all requests.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'iris_token';
const TOKEN_COOKIE = 'iris_jwt';

/** Store JWT after login (localStorage + cookie for proxy) */
export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    // Also set a non-httpOnly cookie so the Next.js proxy can read it
    document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  }
}

/** Get stored JWT */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/** Clear JWT on logout */
export function clearToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  }
}

/** Check if user has a stored token */
export function hasToken(): boolean {
  return !!getToken();
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

/** Make an authenticated request to the backend API */
export async function apiClient<T = any>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — redirect to login
  if (res.status === 401 && typeof window !== 'undefined') {
    clearToken();
    const isAdmin = window.location.pathname.startsWith('/admin');
    window.location.href = isAdmin ? '/admin/login' : '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || data.error || 'Request failed');
    (error as any).status = res.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
