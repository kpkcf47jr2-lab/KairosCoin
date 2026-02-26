// ═══════════════════════════════════════════════════════════════════════════════
//  Kairos Trade — Centralized API Client
//  Auto Bearer token • Auto refresh on 401 • Auto logout on failure
// ═══════════════════════════════════════════════════════════════════════════════

import { STORAGE_KEYS } from '../constants';

const API_HOST = 'https://kairos-api-u6k5.onrender.com';

// Flag to prevent multiple refresh attempts at the same time
let isRefreshing = false;
let refreshPromise = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH)) || null;
  } catch {
    return null;
  }
}

function updateStoredTokens(accessToken, refreshToken) {
  const auth = getStoredAuth();
  if (!auth) return;
  auth.accessToken = accessToken;
  if (refreshToken) auth.refreshToken = refreshToken;
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(auth));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
}

// ── Token Refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken() {
  const auth = getStoredAuth();
  if (!auth?.refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_HOST}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Token refresh failed');
  }

  // Update stored tokens
  updateStoredTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
}

// Debounced refresh — only one refresh at a time
async function getValidToken() {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const auth = getStoredAuth();
  if (!auth?.accessToken) return null;

  // Check if token is close to expiry by decoding JWT payload
  try {
    const payload = JSON.parse(atob(auth.accessToken.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    // Refresh if less than 5 minutes left
    if (expiresIn < 5 * 60 * 1000) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
      return refreshPromise;
    }
  } catch {
    // If we can't decode, just use the token as-is
  }

  return auth.accessToken;
}

// ── Core API Method ──────────────────────────────────────────────────────────

/**
 * Authenticated API request with auto token refresh.
 * 
 * @param {string} path    — API path (e.g. '/api/auth/me')
 * @param {object} opts    — { method, body, headers, noAuth }
 * @returns {Promise<object>} — Parsed JSON response
 */
async function apiRequest(path, opts = {}) {
  const { method = 'GET', body, headers = {}, noAuth = false } = opts;

  const reqHeaders = { 'Content-Type': 'application/json', ...headers };

  // Attach Bearer token unless explicitly noAuth
  if (!noAuth) {
    const token = await getValidToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${API_HOST}${path}`, {
    method,
    headers: reqHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // If 401 on authenticated request, try refreshing token once
  if (res.status === 401 && !noAuth) {
    try {
      const newToken = await refreshAccessToken();
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_HOST}${path}`, {
        method,
        headers: reqHeaders,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      // Refresh failed — force logout
      clearAuth();
      window.dispatchEvent(new Event('kairos:session-expired'));
      throw new Error('Sesión expirada. Inicia sesión de nuevo.');
    }
  }

  // If still 401 after refresh on authenticated request, force logout
  if (res.status === 401 && !noAuth) {
    clearAuth();
    window.dispatchEvent(new Event('kairos:session-expired'));
    throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  }

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Error del servidor');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ── Convenience Methods ──────────────────────────────────────────────────────

const apiClient = {
  host: API_HOST,

  get: (path, opts) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => apiRequest(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: 'DELETE' }),

  // Unauthenticated request (for login/register)
  publicPost: (path, body) => apiRequest(path, { method: 'POST', body, noAuth: true }),

  // Validate current session — returns user data or null
  async validateSession() {
    try {
      const auth = getStoredAuth();
      if (!auth?.accessToken) return null;
      const data = await apiRequest('/api/auth/me');
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  },

  // Refresh token explicitly
  refreshToken: refreshAccessToken,

  // Get current stored token (without refresh)
  getToken() {
    return getStoredAuth()?.accessToken || null;
  },
};

export default apiClient;
