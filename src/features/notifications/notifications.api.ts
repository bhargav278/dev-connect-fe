import type { ApiSuccessPayload } from '../../types/api';
import { axiosInstance } from '../../lib/axiosInstance';

export type NotificationActor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
};

export type Notification = {
  id: string;
  userId: string;
  actorId: string | null;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accept';
  referenceId: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor | null;
};

export type NotificationsResponse = {
  notifications: Notification[];
  totalNotifications: number;
  totalPages: number;
  currentPage: number;
  unreadCount: number;
};

function unwrap<T>(payload: ApiSuccessPayload<T>) {
  if (payload.data === undefined) throw new Error('Malformed response');
  return payload.data;
}

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; limit?: number }) => {
    const res = await axiosInstance.get<ApiSuccessPayload<NotificationsResponse>>(
      '/notifications',
      { params },
    );
    return unwrap(res.data);
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ unreadCount: number }>>(
      '/notifications/unread-count',
    );
    return unwrap(res.data).unreadCount;
  },

  markAllAsRead: async () => {
    await axiosInstance.put('/notifications/mark-all-read');
  },

  markOneAsRead: async (id: string) => {
    await axiosInstance.put(`/notifications/${id}/read`);
  },

  deleteNotification: async (id: string) => {
    await axiosInstance.delete(`/notifications/${id}`);
  },
};
