import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconHeart, IconMessageCircle2, IconTrash, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { postsApi, type Post } from '../../features/posts/posts.api';
import { userApi } from '../../features/user/user.api';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { Avatar } from '../Avatar';
import { ConfirmModal } from '../ConfirmModal';
import { useOnlineUsers } from '../../routes/__root';
import { useDoubleTap } from '../../hooks/useDoubleTap';

interface PostCardProps {
  post: Post;
  mode: 'following' | 'explore';
  showDelete?: boolean;
}

export function PostCard({ post, mode, showDelete = false }: PostCardProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showLikes, setShowLikes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onlineUsers = useOnlineUsers();

  const meQuery = useQuery({ queryKey: ['me'], queryFn: userApi.me, staleTime: Infinity });
  const currentUserId = meQuery.data?.id ?? (qc.getQueryData<{ id: string }>(['me'])?.id);
  const currentUsername = meQuery.data?.username ?? (qc.getQueryData<{ username: string }>(['me'])?.username);

  function goToProfile(username: string) {
    if (currentUsername === username) {
      navigate({ to: '/me' });
    } else {
      navigate({ to: '/u/$username', params: { username } });
    }
  }

  const { handleTap: handleImageDoubleTap, heartBurst } = useDoubleTap(
    post.isLiked ?? false,
    () => likeMutation.mutate(post.id),
  );
  const likeMutation = useMutation({
    mutationFn: (postId: string) => postsApi.toggleLike(postId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (_data, postId) => {
      qc.setQueryData(['feed', mode], (old: any) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((p: Post) =>
            p.id === postId ? { ...p, isLiked: _data.isLiked, likesCount: _data.likesCount } : p,
          ),
        };
      });
      qc.invalidateQueries({ queryKey: ['post', postId] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      qc.invalidateQueries({ queryKey: ['likes', postId] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: string) => postsApi.deletePost(postId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Post deleted');
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });

  const likesQuery = useQuery({
    queryKey: ['likes', post.id],
    queryFn: () => postsApi.getLikes(post.id),
    enabled: showLikes,
  });

  return (
    <>
      <article className="mx-auto w-full max-w-[470px] rounded-xl border border-white/10 bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => goToProfile(post.author.username)}
            className="flex min-w-0 items-center gap-2.5 hover:opacity-80"
          >
            <Avatar name={post.author.name} avatar={post.author.avatar} size="md" online={onlineUsers.has(post.author.id)} />
            <div className="min-w-0 text-left leading-tight">
              <p className="truncate text-sm font-semibold text-white">{post.author.name}</p>
              <p className="truncate text-xs text-zinc-500">@{post.author.username}</p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-zinc-600">{new Date(post.createdAt).toLocaleDateString()}</span>
            {showDelete && currentUserId === post.userId ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deletePostMutation.isPending}
                className="text-zinc-600 hover:text-rose-400 disabled:opacity-40"
                title="Delete post"
              >
                <IconTrash className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Image — double tap to like */}
        {post.imageUrl ? (
          <div
            className="relative aspect-auto w-full overflow-hidden border-y border-white/10 cursor-pointer select-none"
            onClick={handleImageDoubleTap}
          >
            <img src={post.imageUrl} alt="" className="w-full object-cover" />
            {/* Heart burst on double tap */}
            {heartBurst ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <IconHeart className="size-20 fill-white text-white opacity-90 animate-ping" style={{ animationDuration: '0.6s', animationIterationCount: 1 }} />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Code snippet */}
        {post.codeSnippet ? (
          <div className="border-y border-white/10">
            <div className="flex items-center justify-between bg-zinc-800/80 px-4 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-zinc-600" />
                <span className="size-2.5 rounded-full bg-zinc-600" />
                <span className="size-2.5 rounded-full bg-zinc-600" />
              </div>
              {post.language ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{post.language}</span>
              ) : null}
            </div>
            <pre className="max-h-52 overflow-auto bg-zinc-950 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-100">
              <code>{post.codeSnippet}</code>
            </pre>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-4 px-4 pt-3">
          <button
            type="button"
            onClick={() => likeMutation.mutate(post.id)}
            className="transition-transform active:scale-90"
          >
            <IconHeart
              className={`size-6 ${post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-300 hover:text-zinc-100'}`}
            />
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/post/$id', params: { id: post.id } })}
            className="text-zinc-300 hover:text-zinc-100"
          >
            <IconMessageCircle2 className="size-6" />
          </button>
        </div>

        {/* Likes count — clickable to show who liked */}
        {post.likesCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowLikes(true)}
            className="px-4 pt-2 text-sm font-semibold text-white hover:text-zinc-300"
          >
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </button>
        ) : (
          <p className="px-4 pt-2 text-sm text-zinc-600">Be the first to like this</p>
        )}

        {/* Content */}
        <div className="px-4 pb-4 pt-1.5 space-y-1">
          <p className="text-sm text-zinc-100">
            <button
              type="button"
              onClick={() => goToProfile(post.author.username)}
              className="mr-1.5 font-semibold text-white hover:underline"
            >
              {post.author.username}
            </button>
            <span className="line-clamp-3 leading-relaxed">{post.content}</span>
          </p>

          {post.commentsCount > 0 ? (
            <button
              type="button"
              onClick={() => navigate({ to: '/post/$id', params: { id: post.id } })}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              View all {post.commentsCount} comments
            </button>
          ) : null}

          {post.tags?.length ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {post.tags.map((t) => (
                <span key={t} className="text-xs text-indigo-400">#{t}</span>
              ))}
            </div>
          ) : null}
        </div>
      </article>

      {/* Likes modal */}
      {showLikes ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setShowLikes(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl rounded-b-none border border-white/10 bg-zinc-900 p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Liked by</h3>
              <button type="button" onClick={() => setShowLikes(false)} className="text-zinc-400 hover:text-white">
                <IconX className="size-4" />
              </button>
            </div>

            {likesQuery.isLoading ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : likesQuery.isError ? (
              <p className="text-sm text-zinc-400">{getApiErrorMessage(likesQuery.error)}</p>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto">
                {likesQuery.data?.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLikes(false);
                        goToProfile(u.username);
                      }}
                      className="flex items-center gap-3 w-full hover:opacity-80"
                    >
                      <Avatar name={u.name} avatar={u.avatar} size="sm" />
                      <div className="text-left leading-tight">
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-zinc-500">@{u.username}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
      {confirmDelete ? (
        <ConfirmModal
          title="Delete post?"
          description="This will permanently remove the post and all its comments."
          confirmLabel="Delete"
          loading={deletePostMutation.isPending}
          onConfirm={() => deletePostMutation.mutate(post.id)}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </>
  );
}
