import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconUserMinus, IconUserPlus, IconX } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { followApi } from '../features/follow/follow.api';
import { type User } from '../features/user/user.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { Avatar } from './Avatar';
import { useOnlineUsers } from '../routes/__root';

interface FollowListModalProps {
  title: string;
  users: User[];
  onClose: () => void;
  currentUserId?: string;
  /** key prefix for follow-status query invalidation */
  refetchKey?: string;
}

function UserRow({ user, currentUserId, refetchKey, onClose }: { user: User; currentUserId?: string; refetchKey?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isSelf = user.id === currentUserId;
  const onlineUsers = useOnlineUsers();

  const statusQuery = useQuery({
    queryKey: ['followStatus', user.username],
    queryFn: () => followApi.getFollowStatus(user.id),
    enabled: !!currentUserId && !isSelf,
  });

  const followMutation = useMutation({
    mutationFn: () => followApi.follow(user.id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: (status) => {
      toast.success(status === 'pending' ? 'Request sent' : 'Following');
      qc.invalidateQueries({ queryKey: ['followStatus', user.username] });
      if (refetchKey) qc.invalidateQueries({ queryKey: ['followers', refetchKey] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => followApi.unfollow(user.id),
    onError: (e) => toast.error(getApiErrorMessage(e)),
    onSuccess: () => {
      toast.success('Unfollowed');
      qc.invalidateQueries({ queryKey: ['followStatus', user.username] });
      if (refetchKey) qc.invalidateQueries({ queryKey: ['followers', refetchKey] });
    },
  });

  const status = statusQuery.data;
  const isFollowing = status === 'accepted';
  const isPending = status === 'pending';

  function goToProfile() {
    const meUsername = qc.getQueryData<{ username: string }>(['me'])?.username;
    onClose(); // close modal BEFORE navigating so state resets
    if (meUsername === user.username) {
      navigate({ to: '/me' });
    } else {
      navigate({ to: '/u/$username', params: { username: user.username } });
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <button type="button" onClick={goToProfile} className="flex items-center gap-3 hover:opacity-80">
        <Avatar name={user.name} avatar={user.avatar} size="md" online={onlineUsers.has(user.id)} />
        <div className="text-left leading-tight">
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs text-zinc-500">@{user.username}</p>
        </div>
      </button>

      {!isSelf && !statusQuery.isLoading ? (
        isFollowing ? (
          <button
            type="button"
            onClick={() => unfollowMutation.mutate()}
            disabled={unfollowMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
          >
            <IconUserMinus className="size-3.5" />
            Unfollow
          </button>
        ) : isPending ? (
          <button
            type="button"
            onClick={() => unfollowMutation.mutate()}
            disabled={unfollowMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-white/10 disabled:opacity-60"
          >
            Requested · Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            <IconUserPlus className="size-3.5" />
            Follow
          </button>
        )
      ) : null}
    </div>
  );
}

export function FollowListModal({ title, users, onClose, currentUserId, refetchKey }: FollowListModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl rounded-b-none border border-white/10 bg-zinc-900 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <IconX className="size-4" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto px-4 divide-y divide-white/5">
          {users.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">No users yet.</p>
          ) : (
            users.map((u) => (
              <UserRow key={u.id} user={u} currentUserId={currentUserId} refetchKey={refetchKey} onClose={onClose} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
