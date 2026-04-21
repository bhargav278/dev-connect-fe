import type { ApiSuccessPayload } from '../../types/api';
import { axiosInstance } from '../../lib/axiosInstance';

export type User = {
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

function unwrap<T>(payload: ApiSuccessPayload<T>) {
  if (payload.data === undefined) throw new Error('Malformed response (missing data)');
  return payload.data;
}

export const userApi = {
  me: async () => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ user: User }>>('/user/profile');
    return unwrap(res.data).user;
  },
  profileByUsername: async (username: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ user: User }>>(`/user/${username}`);
    return unwrap(res.data).user;
  },
  search: async (q: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ users: User[] }>>('/user/search', { params: { q } });
    return unwrap(res.data).users;
  },
  updateProfile: async (data: { name?: string; username?: string; email?: string; bio?: string }) => {
    const res = await axiosInstance.put<ApiSuccessPayload<{ user: User }>>('/user/profile', data);
    return unwrap(res.data).user;
  },
  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await axiosInstance.put<ApiSuccessPayload<User>>('/user/upload-avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res.data);
  },
};

