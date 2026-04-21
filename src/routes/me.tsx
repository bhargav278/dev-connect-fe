import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconCamera,
  IconCheck,
  IconLock,
  IconLogout,
  IconPencil,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { followApi } from '../features/follow/follow.api';
import { userApi } from '../features/user/user.api';
import { postsApi } from '../features/posts/posts.api';
import { logout } from '../features/auth/auth.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { PostGrid } from '../components/PostGridModal';
import { Avatar } from '../components/Avatar';
import { FollowListModal } from '../components/FollowListModal';

export const Route = createFileRoute('/me')({
  component: MePage,
});

function MePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: userApi.me });

  const followersQuery = useQuery({
    queryKey: ['myFollowers'],
    queryFn: async () => {
      const me = await userApi.me();
      return followApi.followers(me.id);
    },
    enabled: !!meQuery.data,
  });

  const followingQuery = useQuery({
    queryKey: ['myFollowing'],
    queryFn: async () => {
      const me = await userApi.me();
      return followApi.following(me.id);
    },
    enabled: !!meQuery.data,
  });

  const myPostsQuery = useQuery({
    queryKey: ['myPosts'],
    queryFn: async () => {
      const me = await userApi.me();
      return postsApi.getUserPosts(me.id, { page: 1, limit: 20 });
    },
    enabled: !!meQuery.data,
  });

  const requestsQuery = useQuery({
    queryKey: ['followRequests'],
    queryFn: followApi.pendingRequests,
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: () => {
      toast.success('Avatar updated');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; username: string; email: string; bio: string }) =>
      userApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditingProfile(false);
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const privacyMutation = useMutation({
    mutationFn: (isPrivate: boolean) => followApi.updatePrivacy(isPrivate),
    onSuccess: () => {
      toast.success('Privacy updated');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const acceptMutation = useMutation({
    mutationFn: (userId: string) => followApi.accept(userId),
    onSuccess: () => {
      toast.success('Request accepted');
      qc.invalidateQueries({ queryKey: ['followRequests'] });
      qc.invalidateQueries({ queryKey: ['myFollowers'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => followApi.reject(userId),
    onSuccess: () => {
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['followRequests'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      qc.clear();
      navigate({ to: '/login' });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const me = meQuery.data;

  const editForm = useForm({
    initialValues: { name: '', username: '', email: '', bio: '' },
  });

  function startEditing() {
    if (!me) return;
    editForm.setValues({
      name: me.name ?? '',
      username: me.username ?? '',
      email: me.email ?? '',
      bio: me.bio ?? '',
    });
    setEditingProfile(true);
  }

  if (meQuery.isLoading) {
    return <div className="mx-auto max-w-[470px] py-10 text-sm text-zinc-400">Loading…</div>;
  }

  if (meQuery.isError || !me) {
    return (
      <div className="mx-auto max-w-[470px] rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-200">
        {getApiErrorMessage(meQuery.error)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[470px] space-y-6">

      {/* ── Profile header ── */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
        {/* Avatar + stats */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar name={me.name} avatar={me.avatar} size="lg" />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="absolute bottom-0 right-0 grid size-6 place-items-center rounded-full bg-indigo-500 ring-2 ring-zinc-900 hover:bg-indigo-400 disabled:opacity-60"
              title="Change avatar"
            >
              <IconCamera className="size-3.5 text-white" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) avatarMutation.mutate(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Stats */}
          <div className="flex flex-1 justify-around text-center">
            <div>
              <p className="text-base font-bold text-white">{myPostsQuery.data?.totalPosts ?? '—'}</p>
              <p className="text-xs text-zinc-500">posts</p>
            </div>
            <button type="button" onClick={() => setFollowModal('followers')} className="text-center hover:opacity-80">
              <p className="text-base font-bold text-white">{followersQuery.data?.length ?? '—'}</p>
              <p className="text-xs text-zinc-400 hover:text-white">followers</p>
            </button>
            <button type="button" onClick={() => setFollowModal('following')} className="text-center hover:opacity-80">
              <p className="text-base font-bold text-white">{followingQuery.data?.length ?? '—'}</p>
              <p className="text-xs text-zinc-400 hover:text-white">following</p>
            </button>
          </div>        </div>

        {/* Name + bio */}
        <div className="mt-3">
          <p className="text-sm font-semibold text-white">{me.name}</p>
          <p className="text-xs text-zinc-500">@{me.username}</p>
          {me.email ? <p className="mt-0.5 text-xs text-zinc-500">{me.email}</p> : null}
          {me.bio ? (
            <p className="mt-2 text-sm text-zinc-300">{me.bio}</p>
          ) : (
            <p className="mt-2 text-xs text-zinc-600 italic">No bio yet.</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10"
          >
            <IconPencil className="size-4 shrink-0" />
            <span className="truncate">Edit profile</span>
          </button>
          <button
            type="button"
            onClick={() => privacyMutation.mutate(!me.isPrivate)}
            disabled={privacyMutation.isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10 disabled:opacity-60"
          >
            {me.isPrivate ? <IconLock className="size-4 shrink-0" /> : <IconUsers className="size-4 shrink-0" />}
            <span className="truncate">{privacyMutation.isPending ? 'Updating…' : me.isPrivate ? 'Private' : 'Public'}</span>
          </button>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10 disabled:opacity-60 sm:hidden"
            title="Logout"
          >
            <IconLogout className="size-4" />
          </button>
        </div>
      </section>

      {/* ── Edit profile form ── */}
      {editingProfile ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Edit profile</h2>
            <button type="button" onClick={() => setEditingProfile(false)} className="text-zinc-400 hover:text-white">
              <IconX className="size-4" />
            </button>
          </div>

          <form
            className="space-y-3"
            onSubmit={editForm.onSubmit((values) => updateProfileMutation.mutate(values))}
          >
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Name</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent focus:ring-indigo-500/40 placeholder:text-zinc-600"
                placeholder="Your name"
                {...editForm.getInputProps('name')}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Username</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent focus:ring-indigo-500/40 placeholder:text-zinc-600"
                placeholder="username"
                {...editForm.getInputProps('username')}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Email</span>
              <input
                type="email"
                className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent focus:ring-indigo-500/40 placeholder:text-zinc-600"
                placeholder="you@example.com"
                {...editForm.getInputProps('email')}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-zinc-400">Bio</span>
              <textarea
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent focus:ring-indigo-500/40 placeholder:text-zinc-600"
                placeholder="Tell people about yourself…"
                {...editForm.getInputProps('bio')}
              />
            </label>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              <IconCheck className="size-4" />
              {updateProfileMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>
      ) : null}

      {/* ── Pending follow requests ── */}
      {me.isPrivate ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Follow requests
              {requestsQuery.data?.length ? (
                <span className="ml-2 rounded-full bg-indigo-500 px-2 py-0.5 text-xs text-white">
                  {requestsQuery.data.length}
                </span>
              ) : null}
            </h2>
            <Link
              to="/search"
              search={{ q: '' }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
            >
              <IconSearch className="size-3.5" /> Find users
            </Link>
          </div>

          <div className="space-y-3">
            {requestsQuery.data?.length === 0 ? (
              <p className="text-xs text-zinc-600">No pending requests.</p>
            ) : null}

            {requestsQuery.data?.map((r) => (
              <div key={r.requestId} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={r.user.name} avatar={r.user.avatar} size="sm" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-white">{r.user.name}</p>
                    <p className="text-xs text-zinc-500">@{r.user.username}</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => acceptMutation.mutate(r.user.id)}
                    disabled={acceptMutation.isPending}
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-60 sm:flex-none"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate(r.user.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60 sm:flex-none"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── My posts ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Posts</h2>
        {myPostsQuery.isError ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200">
            {getApiErrorMessage(myPostsQuery.error)}
          </div>
        ) : null}
        <PostGrid posts={myPostsQuery.data?.posts ?? []} currentUserId={me.id} showDelete />
      </section>
      {/* ── Follow list modals ── */}
      {followModal === 'followers' && followersQuery.data ? (
        <FollowListModal
          title="Followers"
          users={followersQuery.data}
          onClose={() => setFollowModal(null)}
          currentUserId={me.id}
          refetchKey={me.username}
        />
      ) : null}
      {followModal === 'following' && followingQuery.data ? (
        <FollowListModal
          title="Following"
          users={followingQuery.data}
          onClose={() => setFollowModal(null)}
          currentUserId={me.id}
          refetchKey={me.username}
        />
      ) : null}
    </div>
  );
}
