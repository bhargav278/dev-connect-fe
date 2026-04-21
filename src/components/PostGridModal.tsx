import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconHeart, IconMessageCircle2, IconSend, IconTrash, IconX } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { toast } from 'sonner';
import { postsApi, type Post } from '../features/posts/posts.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getCloudinaryUrl } from '../utils/getCloudinaryUrl';
import { Avatar } from './Avatar';
import { ConfirmModal } from './ConfirmModal';
import { useDoubleTap } from '../hooks/useDoubleTap';
// ─── Grid tile ───────────────────────────────────────────────────────────────

function GridTile({ post, onClick }: { post: Post; onClick: () => void }) {
  const imageUrl = getCloudinaryUrl(post.imageUrl);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square w-full overflow-hidden bg-zinc-800"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : post.codeSnippet ? (
        <pre className="h-full w-full overflow-hidden bg-zinc-900 p-2 font-mono text-[9px] leading-relaxed text-zinc-400 text-left">
          {post.codeSnippet}
        </pre>
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3">
          <p className="line-clamp-4 text-center text-xs text-zinc-400">{post.content}</p>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex items-center gap-1 text-sm font-semibold text-white">
          <IconHeart className="size-5 fill-white" /> {post.likesCount}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-white">
          <IconMessageCircle2 className="size-5 fill-white" /> {post.commentsCount}
        </span>
      </div>
    </button>
  );
}

// ─── Post detail modal ────────────────────────────────────────────────────────

function PostModal({ post: initialPost, onClose, currentUserId, showDelete = false }: { post: Post; onClose: () => void; currentUserId?: string; showDelete?: boolean }) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Fetch live post so counts update after like/comment
  const postQuery = useQuery({
    queryKey: ['post', initialPost.id],
    queryFn: () => postsApi.getPostById(initialPost.id),
    initialData: initialPost,
  });
  const post = postQuery.data ?? initialPost;
  const imageUrl = getCloudinaryUrl(post.imageUrl);

  const commentsQuery = useQuery({
    queryKey: ['comments', post.id],
    queryFn: () => postsApi.getComments(post.id, { page: 1, limit: 50 }),
  });

  const likeMutation = useMutation({
    mutationFn: () => postsApi.toggleLike(post.id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (data) => {
      qc.setQueryData(['post', post.id], (old: any) =>
        old ? { ...old, isLiked: data.isLiked, likesCount: data.likesCount } : old,
      );
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      qc.invalidateQueries({ queryKey: ['likes', post.id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => postsApi.addComment(post.id, content),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', post.id] });
      qc.invalidateQueries({ queryKey: ['post', post.id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      form.reset();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => postsApi.deleteComment(post.id, commentId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', post.id] });
      qc.invalidateQueries({ queryKey: ['post', post.id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => postsApi.deletePost(post.id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Post deleted');
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      onClose();
    },
  });

  const form = useForm({ initialValues: { content: '' } });

  const { handleTap: handleImageDoubleTap, heartBurst } = useDoubleTap(
    post.isLiked ?? false,
    () => likeMutation.mutate(),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl md:flex-row rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: '95dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left — image / code / text */}
        <div className="flex shrink-0 items-center justify-center bg-zinc-950 max-h-[40vh] md:max-h-full md:w-[55%] md:self-stretch">
          {imageUrl ? (
            <div
              className="relative w-full cursor-pointer select-none"
              onClick={handleImageDoubleTap}
            >
              <img src={imageUrl} alt="" className="max-h-[40vh] w-full object-contain md:max-h-full" />
              {heartBurst ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <IconHeart className="size-24 fill-white text-white opacity-90 animate-ping" style={{ animationDuration: '0.6s', animationIterationCount: 1 }} />
                </div>
              ) : null}
            </div>
          ) : post.codeSnippet ? (
            <pre className="h-full w-full overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-100 md:p-6">
              <code>{post.codeSnippet}</code>
            </pre>
          ) : (
            <p className="p-6 text-sm leading-relaxed text-zinc-200 md:p-8">{post.content}</p>
          )}
        </div>

        {/* Right — details + comments */}
        <div className="flex flex-1 flex-col overflow-hidden border-t border-white/10 md:border-l md:border-t-0 min-h-0">
          {/* Author header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={post.author.name} avatar={post.author.avatar} size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">{post.author.name}</p>
                <p className="text-xs text-zinc-500">@{post.author.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 hover:text-white"
                title="Close"
              >
                <IconX className="size-4" />
              </button>
            </div>
          </div>

          {/* Content + tags */}
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm text-zinc-200 leading-relaxed">{post.content}</p>
            {post.tags?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map((t) => (
                  <span key={t} className="text-xs text-indigo-400">#{t}</span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 space-y-3">
            {commentsQuery.data?.comments.map((c) => {
              const canDelete = currentUserId && (c.userId === currentUserId || post.userId === currentUserId);
              return (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar name={c.author.name} avatar={c.author.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white mr-1.5">{c.author.username}</span>
                    <span className="text-xs text-zinc-300">{c.content}</span>
                    <p className="mt-0.5 text-[10px] text-zinc-600">{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => deleteCommentMutation.mutate(c.id)}
                      className="shrink-0 text-zinc-600 hover:text-rose-400"
                    >
                      <IconTrash className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {commentsQuery.data?.comments.length === 0 ? (
              <p className="text-xs text-zinc-600">No comments yet.</p>
            ) : null}
          </div>

          {/* Like count + action */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => likeMutation.mutate()} className="transition-transform active:scale-90">
                <IconHeart className={`size-6 ${post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-300 hover:text-zinc-100'}`} />
              </button>
            </div>
            <p className="text-xs font-semibold text-white mb-1">{post.likesCount} likes</p>
            <p className="text-[10px] text-zinc-600">{new Date(post.createdAt).toLocaleString()}</p>
          </div>

          {/* Add comment */}
          <form
            className="flex items-center gap-2 border-t border-white/10 px-4 py-3"
            onSubmit={form.onSubmit((v) => addCommentMutation.mutate(v.content.trim()))}
          >
            <input
              placeholder="Add a comment…"
              className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              {...form.getInputProps('content')}
            />
            <button
              type="submit"
              disabled={!form.values.content.trim() || addCommentMutation.isPending}
              className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
            >
              <IconSend className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {confirmDelete ? (
        <ConfirmModal
          title="Delete post?"
          description="This will permanently remove the post and all its comments."
          confirmLabel="Delete"
          loading={deletePostMutation.isPending}
          onConfirm={() => deletePostMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </div>
  );
}

// ─── Public grid component ────────────────────────────────────────────────────

interface PostGridProps {
  posts: Post[];
  currentUserId?: string;
  showDelete?: boolean;
}

export function PostGrid({ posts, currentUserId, showDelete = false }: PostGridProps) {
  const [selected, setSelected] = useState<Post | null>(null);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
        No posts yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl">
        {posts.map((p) => (
          <GridTile key={p.id} post={p} onClick={() => setSelected(p)} />
        ))}
      </div>

      {selected ? (
        <PostModal post={selected} onClose={() => setSelected(null)} currentUserId={currentUserId} showDelete={showDelete} />
      ) : null}
    </>
  );
}
