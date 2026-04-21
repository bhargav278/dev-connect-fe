import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconSearch, IconUserMinus, IconUserPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { followApi } from '../features/follow/follow.api';
import { userApi } from '../features/user/user.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { Avatar } from '../components/Avatar';

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>) => {
    return { q: typeof search.q === 'string' ? search.q : '' };
  },
  component: SearchPage,
});

function SearchPage() {
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce: wait 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: userApi.me,
  });

  // Fetch current user's following list to know follow state per result
  const myFollowingQuery = useQuery({
    queryKey: ['myFollowing'],
    queryFn: async () => {
      const me = await userApi.me();
      return followApi.following(me.id);
    },
    enabled: !!meQuery.data,
  });

  const usersQuery = useQuery({
    queryKey: ['userSearch', debouncedQ],
    queryFn: () => userApi.search(debouncedQ),
    enabled: debouncedQ.length >= 2,
  });

  const followMutation = useMutation({
    mutationFn: (userId: string) => followApi.follow(userId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (status) => {
      toast.success(status === 'pending' ? 'Follow request sent' : 'Following');
      qc.invalidateQueries({ queryKey: ['myFollowing'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => followApi.unfollow(userId),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Unfollowed');
      qc.invalidateQueries({ queryKey: ['myFollowing'] });
    },
  });

  const currentUserId = meQuery.data?.id;
  const followingIds = new Set(myFollowingQuery.data?.map((u) => u.id) ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Search users</h1>
        <p className="mt-1 text-sm text-zinc-300">Find people by name or username.</p>
      </div>

      {/* Search input — no submit button, debounced */}
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3 ring-1 ring-transparent focus-within:ring-indigo-500/40">
        <IconSearch className="size-5 shrink-0 text-zinc-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name or @username"
          className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        {usersQuery.isFetching ? (
          <span className="text-xs text-zinc-500">Searching…</span>
        ) : null}
      </div>

      <div className="space-y-3">
        {usersQuery.isError ? (
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5 text-sm text-zinc-200">
            {getApiErrorMessage(usersQuery.error)}
          </div>
        ) : null}

        {debouncedQ.length < 2 ? (
          <p className="text-sm text-zinc-500">Type at least 2 characters to search.</p>
        ) : null}

        {usersQuery.data?.map((u) => {
          const isSelf = u.id === currentUserId;
          const isFollowing = followingIds.has(u.id);

          return (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3"
            >
              <Link
                to="/u/$username"
                params={{ username: u.username }}
                className="flex min-w-0 items-center gap-3 hover:opacity-80"
              >
                <Avatar name={u.name} avatar={u.avatar} size="md" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-white">{u.name}</p>
                  <p className="truncate text-xs text-zinc-500">@{u.username}</p>
                </div>
              </Link>

              {/* No button for self; follow/unfollow based on state */}
              {!isSelf ? (
                isFollowing ? (
                  <button
                    type="button"
                    onClick={() => unfollowMutation.mutate(u.id)}
                    disabled={unfollowMutation.isPending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
                  >
                    <IconUserMinus className="size-3.5" />
                    <span className="hidden sm:inline">Unfollow</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => followMutation.mutate(u.id)}
                    disabled={followMutation.isPending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
                  >
                    <IconUserPlus className="size-3.5" />
                    <span className="hidden sm:inline">Follow</span>
                  </button>
                )
              ) : (
                <span className="text-xs text-zinc-600">You</span>
              )}
            </div>
          );
        })}

        {debouncedQ.length >= 2 && !usersQuery.isFetching && usersQuery.data?.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
            No users found for "{debouncedQ}".
          </div>
        ) : null}
      </div>
    </div>
  );
}
