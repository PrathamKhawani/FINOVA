/**
 * FINOVA API Client
 * Handles all HTTP requests with automatic token refresh.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Token Management ──────────────────────────────────────────────────────────
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('finova_access_token');
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('finova_refresh_token');
};

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem('finova_access_token', access);
  localStorage.setItem('finova_refresh_token', refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem('finova_access_token');
  localStorage.removeItem('finova_refresh_token');
  localStorage.removeItem('finova_user');
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('finova_user');
  return raw ? JSON.parse(raw) : null;
};

export const setStoredUser = (user: any) => {
  localStorage.setItem('finova_user', JSON.stringify(user));
};

// ── Core Fetch with Auth ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Remove Content-Type for FormData (multer needs multipart)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers }).then((r) => r.json());
      });
    }

    isRefreshing = true;
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { data } = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          processQueue(null, data.accessToken);

          headers['Authorization'] = `Bearer ${data.accessToken}`;
          response = await fetch(url, { ...options, headers });
        } else {
          throw new Error('Refresh token invalid');
        }
      } catch (err) {
        processQueue(err, null);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return new Promise(() => {}) as any;
        }
      } finally {
        isRefreshing = false;
      }
    } else {
      isRefreshing = false;
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
        return new Promise(() => {}) as any;
      }
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      clearTokens();
      window.location.href = '/login';
      return new Promise(() => {}) as any;
    }
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return data;
};

// ── API Methods ───────────────────────────────────────────────────────────────
export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: (refreshToken: string) =>
    apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  getMe: () => apiFetch('/auth/me'),

  // Statements
  uploadStatement: (formData: FormData) =>
    apiFetch('/statements/upload', { method: 'POST', body: formData }),

  getStatements: () => apiFetch('/statements'),

  getStatement: (id: string) => apiFetch(`/statements/${id}`),

  deleteStatement: (id: string) =>
    apiFetch(`/statements/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch(`/transactions${qs}`);
  },

  // Dashboard
  getDashboardSummary: () => apiFetch('/dashboard/summary'),

  // Wallet Import
  uploadWalletStatement: (formData: FormData) =>
    apiFetch('/wallet/upload', { method: 'POST', body: formData }),

  // Budget
  getBudgets: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return apiFetch(`/budget${qs}`);
  },
  createBudget: (body: { category: string; limitAmount: number; monthYear?: string; subcategory?: string }) =>
    apiFetch('/budget', { method: 'POST', body: JSON.stringify(body) }),
  updateBudget: (id: string, body: any) =>
    apiFetch(`/budget/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBudget: (id: string) =>
    apiFetch(`/budget/${id}`, { method: 'DELETE' }),

  // Savings Goals
  getSavingsGoals: () => apiFetch('/savings/goals'),
  createSavingsGoal: (body: { name: string; targetAmount: number; savedAmount?: number; targetDate?: string; emoji?: string }) =>
    apiFetch('/savings/goals', { method: 'POST', body: JSON.stringify(body) }),
  updateSavingsGoal: (id: string, body: any) =>
    apiFetch(`/savings/goals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSavingsGoal: (id: string) =>
    apiFetch(`/savings/goals/${id}`, { method: 'DELETE' }),

  // Loans & EMI
  getLoans: () => apiFetch('/loans'),
  createLoan: (body: any) =>
    apiFetch('/loans', { method: 'POST', body: JSON.stringify(body) }),
  updateLoan: (id: string, body: any) =>
    apiFetch(`/loans/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLoan: (id: string) =>
    apiFetch(`/loans/${id}`, { method: 'DELETE' }),
};

