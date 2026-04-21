import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import type { ApiErrorPayload, ApiSuccessPayload } from '../types/api';
import { clearAccessToken, getAccessToken, setAccessToken } from '../features/auth/auth.token';

export const axiosInstance = axios.create({
  baseURL: `${env.apiBaseUrl.replace(/\/+$/, '')}/api`,
  // Backend stores `refreshToken` as an HttpOnly cookie.
  // Cookies must be included so refresh/logout can work.
  withCredentials: true,
});

declare module 'axios' {
  // Internal flags used by our interceptors:
  // - `_skipAuth`: do not attach Bearer token + do not auto-refresh on 401
  // - `_retry`: prevents infinite retry loops for the same request
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuth?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _skipAuth?: boolean;
  }
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config._skipAuth) {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? new AxiosHeaders();
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

// Single-flight refresh:
// If many requests fail with 401 together, we only call `/auth/refresh` once.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await axiosInstance.post<ApiSuccessPayload<{ accessToken: string }>>(
        '/auth/refresh',
        undefined,
        { _skipAuth: true },
      );
      const next = res.data.data?.accessToken;
      if (!next) throw new Error('Refresh failed');
      setAccessToken(next);
      return next;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const axErr = error as AxiosError<ApiErrorPayload>;
    const status = axErr.response?.status;
    const original = axErr.config as InternalAxiosRequestConfig | undefined;
    const url = original?.url ?? '';

    // Never try to refresh:
    // - for requests that explicitly opted out
    // - for the refresh call itself (would loop forever)
    const isAuthRefreshCall = url.includes('/auth/refresh');
    if (!original || original._skipAuth || isAuthRefreshCall) {
      return Promise.reject(error);
    }

    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const nextToken = await refreshAccessToken();
        original.headers = original.headers ?? new AxiosHeaders();
        original.headers.set('Authorization', `Bearer ${nextToken}`);
        return axiosInstance.request(original);
      } catch (e) {
        // Refresh failed (expired cookie/revoked token/etc).
        // Clear local access token so UI can treat user as logged out.
        clearAccessToken();

        // Redirect to the login page.
        // In a React/Vue/Angular app, you might use your router's navigation method here.
        // For example, with React Router: `window.location.href = '/login';`
        window.location.href = '/login'; // Or your specific login route

        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

