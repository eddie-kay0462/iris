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

/** The JSON body the API returns on a failed request. */
type ApiErrorBody = { message?: string | string[]; error?: string };

/** An Error carrying the failed response's status and parsed body. */
type ApiError = Error & { status?: number; data?: unknown };

/**
 * Make an authenticated request to the backend API.
 *
 * `T` defaults to `any` rather than `unknown` so the 26 call sites that don't
 * name a response type keep working; narrowing it is a per-call-site job, not
 * something to change here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Handle 401 — redirect to login (but not for auth endpoints like login/signup)
  const isAuthEndpoint = path.startsWith('/auth/');
  if (res.status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
    clearToken();
    const isAdmin = window.location.pathname.startsWith('/admin');
    window.location.href = isAdmin ? '/admin/login' : '/login';
    throw new Error('Unauthorized');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = { message: 'Request failed' };
  }

  if (!res.ok) {
    const body = (typeof data === 'object' && data !== null ? data : {}) as ApiErrorBody;
    // NestJS message can be a string or array of strings
    const msg = Array.isArray(body.message)
      ? body.message[0]
      : body.message || body.error || 'Request failed';
    const error: ApiError = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
