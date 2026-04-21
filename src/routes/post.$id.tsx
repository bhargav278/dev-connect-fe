import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconHeart, IconMessageCircle2, IconSend, IconTrash, IconX } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import * as yup from 'yup';
import { toast } from 'sonner';
import { postsApi } from '../features/posts/posts.api';
import { userApi } from '../features/user/user.api';
import { yupValidate } from '../utils/yupValidate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { Avatar } from '../components/Avatar';
import { useOnlineUsers } from './__root';
import { useDoubleTap } from '../hooks/useDoubleTap';

export const Route = createFileRoute('/post/$id')({
  component: PostDetailPage,
});

const commentSchema = yup.object({
  content: yup.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Max 2000 characters').required(),
});

function PostDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onlineUsers = useOnlineUsers();
  const [showLikes, setShowLikes] = useState(false);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: userApi.me });

  const postQuery = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPostById(id),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => postsApi.getComments(id, { page: 1, limit: 50 }),
    enabled: !!id,
  });

  const likesQuery = useQuery({
    queryKey: ['likes', id],
    queryFn: () => postsApi.getLikes(id),
    enabled: showLikes,
  });

  const likeMutation = useMutation({
    mutationFn: () => postsApi.toggleLike(id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (data) => {
      qc.setQueryData(['post', id], (old: any) => (old ? { ...old, isLiked: data.isLiked, likesCount: data.likesCount } : old));
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
      qc.invalidateQueries({ queryKey: ['likes', id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => postsApi.addComment(id, content),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Comment added');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => postsApi.deleteComment(id, commentId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Comment deleted');
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });

  const form = useForm({
    initialValues: { content: '' },
    validate: yupValidate(commentSchema),
  });

  const post = postQuery.data;
  const currentUserId = meQuery.data?.id;
  const currentUsername = meQuery.data?.username;

  const { handleTap: handleImageDoubleTap, heartBurst } = useDoubleTap(
    post?.isLiked ?? false,
    () => likeMutation.mutate(),
  );

  function goToProfile(username: string) {
    if (currentUsername === username) navigate({ to: '/me' });
    else navigate({ to: '/u/$username', params: { username } });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/feed"
        search={{ mode: 'following' }}
        className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/3 px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
      >
        <IconArrowLeft className="size-4" />
        Back
      </Link>

      {postQuery.isError ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-200">
          {getApiErrorMessage(postQuery.error)}
        </div>
      ) : null}

      {post ? (
        <article className="rounded-2xl border border-white/10 bg-zinc-900">
          {/* Author header */}
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <button
              type="button"
              onClick={() => goToProfile(post.author.username)}
              className="flex min-w-0 items-center gap-3 hover:opacity-80"
            >
              <Avatar
                name={post.author.name}
                avatar={post.author.avatar}
                size="md"
                online={onlineUsers.has(post.author.id)}
              />
              <div className="min-w-0 text-left leading-tight">
                <p className="truncate text-sm font-semibold text-white">{post.author.name}</p>
                <p className="truncate text-xs text-zinc-500">@{post.author.username}</p>
              </div>
            </button>
            <span className="shrink-0 text-xs text-zinc-600">{new Date(post.createdAt).toLocaleString()}</span>
          </div>

          {/* Content */}
          <div className="px-5 pb-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">{post.content}</p>
            {post.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <span key={t} className="text-xs text-indigo-400">#{t}</span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Image */}
          {post.imageUrl ? (
            <div
              className="relative overflow-hidden border-y border-white/10 cursor-pointer select-none"
              onClick={handleImageDoubleTap}
            >
              <img src={post.imageUrl} alt="" className="w-full object-cover" />
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
              <pre className="overflow-x-auto bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
                <code>{post.codeSnippet}</code>
              </pre>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center gap-4 px-5 pt-4">
            <button
              type="button"
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className="transition-transform active:scale-90"
            >
              <IconHeart className={`size-6 ${post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-300 hover:text-zinc-100'}`} />
            </button>
            <IconMessageCircle2 className="size-6 text-zinc-300" />
          </div>

          {/* Likes count — clickable */}
          {post.likesCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowLikes(true)}
              className="px-5 pt-2 text-sm font-semibold text-white hover:text-zinc-300"
            >
              {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
            </button>
          ) : (
            <p className="px-5 pt-2 text-sm text-zinc-600">Be the first to like this</p>
          )}

          <p className="px-5 pb-4 pt-1 text-xs text-zinc-600">{post.commentsCount} comments</p>
        </article>
      ) : postQuery.isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">Loading…</div>
      ) : null}

      {/* Comments section */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Comments</h2>

        {/* Add comment */}
        <form
          className="flex items-start gap-3"
          onSubmit={form.onSubmit((values) => {
            addCommentMutation.mutate(values.content.trim());
            form.setFieldValue('content', '');
          })}
        >
          {meQuery.data ? (
            <Avatar name={meQuery.data.name} avatar={meQuery.data.avatar} size="sm" />
          ) : null}
          <div className="flex-1 space-y-2">
            <textarea
              rows={2}
              placeholder="Write a comment…"
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 ring-1 ring-transparent focus:ring-indigo-500/40"
              {...form.getInputProps('content')}
            />
            {form.errors.content ? <p className="text-xs text-rose-300">{form.errors.content}</p> : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addCommentMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                <IconSend className="size-3.5" />
                {addCommentMutation.isPending ? 'Posting…' : 'Comment'}
              </button>
            </div>
          </div>
        </form>

        {/* Comment list */}
        <div className="mt-5 space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scroll">
          {commentsQuery.isError ? (
            <p className="text-sm text-zinc-400">{getApiErrorMessage(commentsQuery.error)}</p>
          ) : null}

          {commentsQuery.data?.comments?.map((c) => {
            const canDelete = currentUserId && (c.userId === currentUserId || post?.userId === currentUserId);
            return (
              <div key={c.id} className="flex items-start gap-3">
                <button type="button" onClick={() => goToProfile(c.author.username)} className="shrink-0">
                  <Avatar
                    name={c.author.name}
                    avatar={c.author.avatar}
                    size="sm"
                    online={onlineUsers.has(c.author.id)}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="rounded-xl bg-zinc-800/60 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => goToProfile(c.author.username)}
                      className="text-xs font-semibold text-white hover:underline"
                    >
                      {c.author.name}
                    </button>
                    <span className="ml-1.5 text-xs text-zinc-500">@{c.author.username}</span>
                    <p className="mt-1 text-sm text-zinc-100 whitespace-pre-wrap">{c.content}</p>
                  </div>
                  <p className="mt-1 px-1 text-[10px] text-zinc-600">{new Date(c.createdAt).toLocaleString()}</p>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => deleteCommentMutation.mutate(c.id)}
                    disabled={deleteCommentMutation.isPending}
                    className="mt-1 shrink-0 text-zinc-600 hover:text-rose-400 disabled:opacity-40"
                    title="Delete"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}

          {commentsQuery.data?.comments.length === 0 ? (
            <p className="text-sm text-zinc-600">No comments yet. Be the first!</p>
          ) : null}
        </div>
      </section>

      {/* Likes modal */}
      {showLikes ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowLikes(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl rounded-b-none border border-white/10 bg-zinc-900 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">Liked by</h3>
              <button type="button" onClick={() => setShowLikes(false)} className="text-zinc-400 hover:text-white">
                <IconX className="size-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto px-4 divide-y divide-white/5">
              {likesQuery.isLoading ? (
                <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>
              ) : likesQuery.data?.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">No likes yet.</p>
              ) : (
                likesQuery.data?.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setShowLikes(false); goToProfile(u.username); }}
                    className="flex w-full items-center gap-3 py-3 hover:opacity-80"
                  >
                    <Avatar name={u.name} avatar={u.avatar} size="sm" online={onlineUsers.has(u.id)} />
                    <div className="text-left leading-tight">
                      <p className="text-sm font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-zinc-500">@{u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
