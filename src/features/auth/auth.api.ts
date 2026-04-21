import type { ApiSuccessPayload } from '../../types/api';
import { axiosInstance } from '../../lib/axiosInstance';
import { clearAccessToken, setAccessToken } from './auth.token';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email?: string;
  bio?: string | null;
  avatar?: string | null;
  role?: string;
  createdAt?: string;
  isPrivate?: boolean;
};

export type AuthTokensResponse = {
  user: AuthUser;
  accessToken: string;
};

export type RegisterRequest = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

function unwrap<T>(payload: ApiSuccessPayload<T>) {
  if (!payload.data) throw new Error('Malformed response (missing data)');
  return payload.data;
}

export async function login(req: LoginRequest): Promise<AuthTokensResponse> {
  // Login/register do not need an access token, so we opt out of auth headers + auto-refresh.
  const response = await axiosInstance.post<ApiSuccessPayload<AuthTokensResponse>>('/auth/login', req, {
    _skipAuth: true,
  });
  const data = unwrap(response.data);
  setAccessToken(data.accessToken);
  return data;
}

export async function register(req: RegisterRequest): Promise<AuthTokensResponse> {
  // Login/register do not need an access token, so we opt out of auth headers + auto-refresh.
  const response = await axiosInstance.post<ApiSuccessPayload<AuthTokensResponse>>('/auth/register', req, {
    _skipAuth: true,
  });
  const data = unwrap(response.data);
  setAccessToken(data.accessToken);
  return data;
}

export async function refresh(): Promise<AuthTokensResponse> {
  // Refresh uses the HttpOnly cookie, so it must not rely on an access token.
  const response = await axiosInstance.post<ApiSuccessPayload<AuthTokensResponse>>(
    '/auth/refresh',
    undefined,
    { _skipAuth: true },
  );
  const data = unwrap(response.data);
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  await axiosInstance.post('/auth/logout');
  clearAccessToken();
}