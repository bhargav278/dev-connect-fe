import type { ApiSuccessPayload } from '../../types/api';
import { axiosInstance } from '../../lib/axiosInstance';
import type { User } from '../user/user.api';

export type FollowRequest = {
  requestId: string;
  user: User;
  requestedAt: string;
};

function unwrap<T>(payload: ApiSuccessPayload<T>) {
  if (payload.data === undefined) throw new Error('Malformed response (missing data)');
  return payload.data;
}

export const followApi = {
  follow: async (userId: string) => {
    const res = await axiosInstance.post<ApiSuccessPayload<{ status: 'pending' | 'accepted' }>>(
      `/follow/${userId}/follow`,
    );
    return unwrap(res.data).status;
  },
  unfollow: async (userId: string) => {
    await axiosInstance.delete(`/follow/${userId}/follow`);
  },
  accept: async (userId: string) => {
    await axiosInstance.post(`/follow/${userId}/follow/accept`);
  },
  reject: async (userId: string) => {
    await axiosInstance.post(`/follow/${userId}/follow/reject`);
  },
  followers: async (userId: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ followers: User[] }>>(`/follow/${userId}/followers`);
    return unwrap(res.data).followers;
  },
  following: async (userId: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ following: User[] }>>(`/follow/${userId}/following`);
    return unwrap(res.data).following;
  },
  pendingRequests: async () => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ requests: FollowRequest[] }>>('/follow/me/requests');
    return unwrap(res.data).requests;
  },
  updatePrivacy: async (isPrivate: boolean) => {
    const res = await axiosInstance.put<ApiSuccessPayload<{ isPrivate: boolean }>>('/follow/me/privacy', { isPrivate });
    return unwrap(res.data).isPrivate;
  },
  getFollowStatus: async (userId: string): Promise<'none' | 'pending' | 'accepted' | 'self'> => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ status: 'none' | 'pending' | 'accepted' | 'self' }>>(`/follow/${userId}/status`);
    return unwrap(res.data).status;
  },
};

