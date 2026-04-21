import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconLock, IconUserMinus, IconUserPlus } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { followApi } from '../features/follow/follow.api';
import { postsApi } from '../features/posts/posts.api';
import { userApi } from '../features/user/user.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { PostGrid } from '../components/PostGridModal';
import { Avatar } from '../components/Avatar';
import { FollowListModal } from '../components/FollowListModal';
import { useOnlineUsers } from './__root';

export const Route = createFileRoute('/u/$username')({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: userApi.me,
  });

  const userQuery = useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => userApi.profileByUsername(username),
  });

  const followStatusQuery = useQuery({
    queryKey: ['followStatus', username],
    queryFn: async () => {
      const u = await userApi.profileByUsername(username);
      return followApi.getFollowStatus(u.id);
    },
    enabled: !!username,
  });

  const followersQuery = useQuery({
    queryKey: ['followers', username],
    queryFn: async () => {
      const u = await userApi.profileByUsername(username);
      return followApi.followers(u.id);
    },
    enabled: !!username,
  });

  const followingQuery = useQuery({
    queryKey: ['following', username],
    queryFn: async () => {
      const u = await userApi.profileByUsername(username);
      return followApi.following(u.id);
    },
    enabled: !!username,
  });

  const postsQuery = useQuery({
    queryKey: ['userPosts', username],
    queryFn: async () => {
      const u = await userApi.profileByUsername(username);
      return postsApi.getUserPosts(u.id, { page: 1, limit: 20 });
    },
    enabled: !!username,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => followApi.follow(userId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (status) => {
      toast.success(status === 'pending' ? 'Follow request sent' : 'Following');
      qc.invalidateQueries({ queryKey: ['followStatus', username] });
      qc.invalidateQueries({ queryKey: ['followers', username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => followApi.unfollow(userId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Unfollowed');
      qc.invalidateQueries({ queryKey: ['followStatus', username] });
      qc.invalidateQueries({ queryKey: ['followers', username] });
    },
  });

  const u = userQuery.data;
  const currentUserId = meQuery.data?.id;
  const isOwnProfile = currentUserId && u && currentUserId === u.id;
  const followStatus = followStatusQuery.data;
  const isFollowing = followStatus === 'accepted';
  const isPending = followStatus === 'pending';
  const isPrivateAndLocked = u?.isPrivate && !isOwnProfile && !isFollowing;

  // Can view followers/following if: own profile, public account, or following
  const canViewFollowLists = isOwnProfile || !u?.isPrivate || isFollowing;
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const onlineUsers = useOnlineUsers();

  // Reset modal when navigating to a different profile
  const prevUsername = useRef(username);
  if (prevUsername.current !== username) {
    prevUsername.current = username;
    if (followModal !== null) setFollowModal(null);
  }

  return (
    <div className="mx-auto max-w-[470px] space-y-6">
      {userQuery.isError ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-sm text-zinc-200">
          {getApiErrorMessage(userQuery.error)}
        </div>
      ) : null}

      {u ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
          {/* Avatar + stats row */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Avatar name={u.name} avatar={u.avatar} size="lg" online={onlineUsers.has(u.id)} />
            <div className="flex flex-1 justify-around gap-2 text-center sm:flex-none sm:gap-6">
              <div>
                <p className="text-base font-bold text-white">{postsQuery.data?.totalPosts ?? '—'}</p>
                <p className="text-xs text-zinc-500">posts</p>
              </div>
              <button
                type="button"
                disabled={!canViewFollowLists}
                onClick={() => canViewFollowLists && setFollowModal('followers')}
                className="text-center disabled:cursor-default"
              >
                <p className="text-base font-bold text-white">{followersQuery.data?.length ?? '—'}</p>
                <p className={`text-xs ${canViewFollowLists ? 'text-zinc-400 hover:text-white' : 'text-zinc-500'}`}>followers</p>
              </button>
              <button
                type="button"
                disabled={!canViewFollowLists}
                onClick={() => canViewFollowLists && setFollowModal('following')}
                className="text-center disabled:cursor-default"
              >
                <p className="text-base font-bold text-white">{followingQuery.data?.length ?? '—'}</p>
                <p className={`text-xs ${canViewFollowLists ? 'text-zinc-400 hover:text-white' : 'text-zinc-500'}`}>following</p>
              </button>
            </div>
          </div>

          {/* Name + bio */}
          <div className="mt-3">
            <p className="text-sm font-semibold text-white">{u.name}</p>
            <p className="text-xs text-zinc-500">@{u.username}</p>
            {u.bio ? <p className="mt-2 text-sm text-zinc-300">{u.bio}</p> : null}
          </div>

          {/* Follow / Unfollow — hide on own profile */}
          {!isOwnProfile ? (
            <div className="mt-4 flex gap-2">
              {isFollowing ? (
                <button
                  type="button"
                  onClick={() => unfollowMutation.mutate(u.id)}
                  disabled={unfollowMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10 disabled:opacity-60"
                >
                  <IconUserMinus className="size-4" />
                  Unfollow
                </button>
              ) : isPending ? (
                <button
                  type="button"
                  onClick={() => unfollowMutation.mutate(u.id)}
                  disabled={unfollowMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 hover:bg-white/10 disabled:opacity-60"
                >
                  <IconUserMinus className="size-4" />
                  Requested · Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => followMutation.mutate(u.id)}
                  disabled={followMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                >
                  <IconUserPlus className="size-4" />
                  Follow
                </button>
              )}
            </div>
          ) : null}
        </section>
      ) : userQuery.isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 text-sm text-zinc-200">Loading…</div>
      ) : null}

      {/* Posts section */}
      {isPrivateAndLocked ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
          <IconLock className="mx-auto mb-3 size-8 text-zinc-500" />
          <p className="text-sm font-semibold text-white">This account is private</p>
          <p className="mt-1 text-xs text-zinc-500">Follow this account to see their posts.</p>
        </div>
      ) : (
        <>
          {postsQuery.isError ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-zinc-200">
              {getApiErrorMessage(postsQuery.error)}
            </div>
          ) : null}
          <PostGrid posts={postsQuery.data?.posts ?? []} currentUserId={currentUserId} />
        </>
      )}
      {/* Follow list modals */}
      {followModal === 'followers' && followersQuery.data ? (
        <FollowListModal
          title="Followers"
          users={followersQuery.data}
          onClose={() => setFollowModal(null)}
          currentUserId={currentUserId}
          refetchKey={username}
        />
      ) : null}
      {followModal === 'following' && followingQuery.data ? (
        <FollowListModal
          title="Following"
          users={followingQuery.data}
          onClose={() => setFollowModal(null)}
          currentUserId={currentUserId}
          refetchKey={username}
        />
      ) : null}
    </div>
  );
}
