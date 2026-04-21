import type { ApiSuccessPayload } from '../../types/api';
import { axiosInstance } from '../../lib/axiosInstance';

export type PostAuthor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isPrivate: boolean;
};

export type Post = {
  id: string;
  userId: string;
  content: string;
  codeSnippet: string | null;
  language: string | null;
  tags: string[] | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PostAuthor;
  isLiked?: boolean;
};

export type FeedResponse = {
  posts: Post[];
  totalPosts: number;
  totalPages: number;
  currentPage: number;
};

export type CommentAuthor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
};

export type CommentsResponse = {
  comments: Comment[];
  totalComments: number;
  totalPages: number;
  currentPage: number;
};

function unwrap<T>(payload: ApiSuccessPayload<T>) {
  if (payload.data === undefined) throw new Error('Malformed response (missing data)');
  return payload.data;
}

export const postsApi = {
  personalFeed: async (params: { page?: number; limit?: number; tag?: string }) => {
    const res = await axiosInstance.get<ApiSuccessPayload<FeedResponse>>('/posts/feed', { params });
    return unwrap(res.data);
  },
  exploreFeed: async (params: { page?: number; limit?: number; tag?: string }) => {
    const res = await axiosInstance.get<ApiSuccessPayload<FeedResponse>>('/posts/explore', { params });
    return unwrap(res.data);
  },
  createPost: async (data: {
    content: string;
    codeSnippet?: string;
    language?: string;
    tags?: string[];
    image?: File | null;
  }) => {
    const form = new FormData();
    form.append('content', data.content);
    if (data.codeSnippet) form.append('codeSnippet', data.codeSnippet);
    if (data.language) form.append('language', data.language);
    if (data.tags?.length) form.append('tags', JSON.stringify(data.tags));
    if (data.image) form.append('image', data.image);

    const res = await axiosInstance.post<ApiSuccessPayload<{ post: Post }>>('/posts', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res.data).post;
  },
  getPostById: async (postId: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ post: Post }>>(`/posts/${postId}`);
    return unwrap(res.data).post;
  },
  deletePost: async (postId: string) => {
    await axiosInstance.delete(`/posts/${postId}`);
  },
  toggleLike: async (postId: string) => {
    const res = await axiosInstance.post<ApiSuccessPayload<{ isLiked: boolean; likesCount: number }>>(
      `/posts/${postId}/like`,
    );
    return unwrap(res.data);
  },
  getLikes: async (postId: string) => {
    const res = await axiosInstance.get<ApiSuccessPayload<{ users: CommentAuthor[] }>>(`/posts/${postId}/likes`);
    return unwrap(res.data).users;
  },
  getComments: async (postId: string, params: { page?: number; limit?: number }) => {
    const res = await axiosInstance.get<ApiSuccessPayload<CommentsResponse>>(`/posts/${postId}/comments`, { params });
    return unwrap(res.data);
  },
  addComment: async (postId: string, content: string) => {
    const res = await axiosInstance.post<ApiSuccessPayload<{ comment: Comment }>>(`/posts/${postId}/comments`, {
      content,
    });
    return unwrap(res.data).comment;
  },
  deleteComment: async (postId: string, commentId: string) => {
    await axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);
  },
  getUserPosts: async (userId: string, params: { page?: number; limit?: number }) => {
    const res = await axiosInstance.get<ApiSuccessPayload<FeedResponse>>(`/posts/user/${userId}`, { params });
    return unwrap(res.data);
  },
};

