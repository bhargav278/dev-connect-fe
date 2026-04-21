import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBell, IconCheck, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import { notificationsApi, type Notification } from '../features/notifications/notifications.api';
import { Avatar } from '../components/Avatar';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
});

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications({ page: 1, limit: 50 }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      toast.success('All marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const markOneMutation = useMutation({
    mutationFn: notificationsApi.markOneAsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.deleteNotification,
    onSuccess: () => {
      toast.success('Notification removed');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  function handleClick(n: Notification) {
    if (!n.isRead) markOneMutation.mutate(n.id);
    switch (n.type) {
      case 'like':
      case 'comment':
        if (n.referenceId) navigate({ to: '/post/$id', params: { id: n.referenceId } });
        break;
      case 'follow':
      case 'follow_accept':
        if (n.actor) navigate({ to: '/u/$username', params: { username: n.actor.username } });
        break;
      case 'follow_request':
        navigate({ to: '/me' });
        break;
    }
  }

  const unread = data?.notifications.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Notifications</h1>
          {unread > 0 ? (
            <p className="mt-0.5 text-sm text-zinc-400">{unread} unread</p>
          ) : null}
        </div>
        {unread > 0 ? (
          <button
            type="button"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-60"
          >
            <IconCheck className="size-3.5" />
            Mark all read
          </button>
        ) : null}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">Loading…</p>
        ) : isError ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-400">{getApiErrorMessage(error)}</p>
        ) : data?.notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <IconBell className="size-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">No notifications yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5 max-h-[70dvh] overflow-y-auto custom-scroll sm:max-h-[600px]">
            {data?.notifications.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.isRead ? 'bg-indigo-500/5' : ''}`}>
                {/* Avatar */}
                <button type="button" onClick={() => handleClick(n)} className="relative shrink-0 mt-0.5">
                  {n.actor ? (
                    <Avatar name={n.actor.name} avatar={n.actor.avatar} size="sm" />
                  ) : (
                    <div className="grid size-8 place-items-center rounded-full bg-zinc-700">
                      <IconBell className="size-4 text-zinc-400" />
                    </div>
                  )}
                  {!n.isRead && (
                    <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-indigo-500" />
                  )}
                </button>

                {/* Content */}
                <button type="button" onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left">
                  <p className={`text-sm leading-relaxed ${!n.isRead ? 'text-white' : 'text-zinc-300'}`}>
                    {n.actor ? <span className="font-semibold">{n.actor.name} </span> : null}
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">{timeAgo(n.createdAt)}</p>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(n.id)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 text-zinc-700 hover:text-rose-400 disabled:opacity-40 mt-1"
                  title="Remove"
                >
                  <IconTrash className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
