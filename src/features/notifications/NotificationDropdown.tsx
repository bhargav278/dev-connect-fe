import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconBell, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import { notificationsApi, type Notification } from './notifications.api';
import { Avatar } from '../../components/Avatar';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

// ─── Time ago helper ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Navigate on notification click ──────────────────────────────────────────
function useNotificationNav() {
  const navigate = useNavigate();
  return (n: Notification) => {
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
  };
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotificationRow({
  n,
  onNavigate,
}: {
  n: Notification;
  onNavigate: (n: Notification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(n)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
        !n.isRead ? 'bg-indigo-500/5' : ''
      }`}
    >
      {/* Actor avatar */}
      <div className="relative shrink-0">
        {n.actor ? (
          <Avatar name={n.actor.name} avatar={n.actor.avatar} size="sm" />
        ) : (
          <div className="grid size-8 place-items-center rounded-full bg-zinc-700">
            <IconBell className="size-4 text-zinc-400" />
          </div>
        )}
        {/* Unread dot */}
        {!n.isRead && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-indigo-500" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={`text-xs leading-relaxed ${!n.isRead ? 'text-white' : 'text-zinc-300'}`}>
          {n.actor ? (
            <span className="font-semibold">{n.actor.name} </span>
          ) : null}
          {n.message}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  );
}

// ─── Main dropdown component ──────────────────────────────────────────────────
interface NotificationDropdownProps {
  unreadCount: number;
  onRead: () => void; // called after mark-all-read so parent resets badge
}

export function NotificationDropdown({ unreadCount, onRead }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const goTo = useNotificationNav();

  // Fetch latest 5 when dropdown opens
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications({ page: 1, limit: 5 }),
    enabled: open,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] });
      onRead();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const markOneMutation = useMutation({
    mutationFn: notificationsApi.markOneAsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notificationsUnread'] });
    },
  });
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markOneMutation.mutate(n.id);
    setOpen(false);
    goTo(n);
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
      >
        <IconBell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
              >
                <IconCheck className="size-3" />
                Mark all read
              </button>
            ) : null}
          </div>

          {/* List */}
          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto custom-scroll">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-500">Loading…</p>
            ) : data?.notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-500">No notifications yet.</p>
            ) : (
              data?.notifications.map((n) => (
                <NotificationRow key={n.id} n={n} onNavigate={handleNotificationClick} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate({ to: '/notifications' });
              }}
              className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300"
            >
              See all notifications
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
