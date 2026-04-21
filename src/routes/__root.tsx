import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { IconBell, IconBolt, IconCompass, IconHome2, IconLogout, IconSearch, IconUser } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logout } from '../features/auth/auth.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { AUTH_CHANGE_EVENT, getAccessToken } from '../features/auth/auth.token';
import { socket } from '../lib/socket';
import { NotificationDropdown } from '../features/notifications/NotificationDropdown';
import { notificationsApi } from '../features/notifications/notifications.api';

export const Route = createRootRoute({
  component: RootLayout,
});

/** Context so any component can check if a user is online */
const OnlineUsersContext = createContext<Set<string>>(new Set());
export const useOnlineUsers = () => useContext(OnlineUsersContext);

function RootLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [isAuthed, setIsAuthed] = useState(() => !!getAccessToken());

  /** Fetch real unread count from API — covers offline notifications */
  const unreadQuery = useQuery({
    queryKey: ['notificationsUnread'],
    queryFn: notificationsApi.getUnreadCount,
    enabled: isAuthed,
    refetchOnWindowFocus: true,
  });
  const unreadCount = unreadQuery.data ?? 0;

  /** set of online userIds — used to show green dots anywhere in the app */
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // ── Auth state sync ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const authed = !!getAccessToken();
      setIsAuthed(authed);
      if (!authed) {
        // Clear unread count when logged out
        qc.removeQueries({ queryKey: ['notificationsUnread'] });
      }
    };
    window.addEventListener(AUTH_CHANGE_EVENT, handler);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handler);
  }, [qc]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    // online_users_list — seed initial online set when socket first connects
    const onOnlineUsersList = ({ userIds }: { userIds: string[] }) => {
      setOnlineUsers(new Set(userIds));
    };

    // new_notification — refetch unread count immediately so badge updates
    const onNewNotification = () => {
      qc.refetchQueries({ queryKey: ['notificationsUnread'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    };

    // user_online — add userId to online set
    const onUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    // user_offline — remove userId from online set
    const onUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('online_users_list', onOnlineUsersList);
    socket.on('new_notification', onNewNotification);
    socket.on('user_online', onUserOnline);
    socket.on('user_offline', onUserOffline);

    // If socket already connected (page refresh), request current list
    if (socket.connected) {
      socket.emit('get_online_users');
    }

    return () => {
      socket.off('online_users_list', onOnlineUsersList);
      socket.off('new_notification', onNewNotification);
      socket.off('user_online', onUserOnline);
      socket.off('user_offline', onUserOffline);
    };
  }, [qc]);

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      toast.success('Logged out');
      setOnlineUsers(new Set());
      qc.removeQueries({ queryKey: ['notificationsUnread'] });
      navigate({ to: '/login' });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <OnlineUsersContext.Provider value={onlineUsers}>
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            to={isAuthed ? '/feed' : '/login'}
            search={isAuthed ? { mode: 'following' } : undefined}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <IconBolt className="size-5" />
            </span>
            <span>DevConnect</span>
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden items-center gap-1 text-sm text-zinc-300 sm:flex">
            {isAuthed ? (
              <>
                <Link
                  to="/feed"
                  search={{ mode: 'following' }}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                  activeProps={{ className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 text-white' }}
                >
                  <IconHome2 className="size-4 shrink-0" />
                  Feed
                </Link>
                <Link
                  to="/search"
                  search={{ q: '' }}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                  activeProps={{ className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 text-white' }}
                >
                  <IconSearch className="size-4 shrink-0" />
                  Search
                </Link>
                <Link
                  to="/me"
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                  activeProps={{ className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 text-white' }}
                >
                  <IconUser className="size-4 shrink-0" />
                  Me
                </Link>
                <NotificationDropdown
                  unreadCount={unreadCount}
                  onRead={() => qc.refetchQueries({ queryKey: ['notificationsUnread'] })}
                />
                <button
                  type="button"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white disabled:opacity-60"
                >
                  <IconLogout className="size-4 shrink-0" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                  activeProps={{ className: 'rounded-lg px-3 py-2 bg-white/10 text-white' }}
                >
                  Login
                </Link>
                <Link
                  to="/create-user"
                  className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                  activeProps={{ className: 'rounded-lg px-3 py-2 bg-white/10 text-white' }}
                >
                  Create user
                </Link>
              </>
            )}
          </nav>

          {/* Mobile header right — only notification bell when authed */}
          {isAuthed ? (
            <div className="flex items-center sm:hidden">
              <NotificationDropdown
                unreadCount={unreadCount}
                onRead={() => qc.refetchQueries({ queryKey: ['notificationsUnread'] })}
              />
            </div>
          ) : (
            <nav className="flex items-center gap-1 text-sm text-zinc-300 sm:hidden">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                activeProps={{ className: 'rounded-lg px-3 py-2 bg-white/10 text-white' }}
              >
                Login
              </Link>
              <Link
                to="/create-user"
                className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                activeProps={{ className: 'rounded-lg px-3 py-2 bg-white/10 text-white' }}
              >
                Register
              </Link>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:py-10 sm:pb-10">
        <Outlet />
      </main>

      {/* Mobile bottom nav — only when authed */}
      {isAuthed ? (
        <nav
          className="fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t border-white/10 bg-zinc-950/90 backdrop-blur sm:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Each tab: flex-1 so all 5 are exactly equal width */}
          <Link
            to="/feed"
            search={{ mode: 'following' }}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-white"
            activeProps={{ className: 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-white' }}
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <IconHome2 className="size-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">Feed</span>
              </>
            )}
          </Link>

          <Link
            to="/search"
            search={{ q: '' }}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-white"
            activeProps={{ className: 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-white' }}
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <IconSearch className="size-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">Search</span>
              </>
            )}
          </Link>

          <Link
            to="/me"
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-white"
            activeProps={{ className: 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-white' }}
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <IconUser className="size-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">Me</span>
              </>
            )}
          </Link>

          <Link
            to="/notifications"
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-white"
            activeProps={{ className: 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-white' }}
          >
            {({ isActive }) => (
              <>
                <span className={`relative grid size-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <IconBell className="size-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute right-0.5 top-0.5 grid size-3.5 place-items-center rounded-full bg-rose-500 text-[8px] font-bold text-white leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="text-[10px] font-medium leading-none">Alerts</span>
              </>
            )}
          </Link>

          <Link
            to="/feed"
            search={{ mode: 'explore' as const }}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-zinc-500 hover:text-white"
            activeProps={{ className: 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-white' }}
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                  <IconCompass className="size-5" />
                </span>
                <span className="text-[10px] font-medium leading-none">Explore</span>
              </>
            )}
          </Link>
        </nav>
      ) : null}
    </div>
    </OnlineUsersContext.Provider>
  );
}

/**
 * Exported so any component can read the online users set without prop drilling.
 * Usage: const { onlineUsers } = useOnlineUsers();
 *
 * For now the set lives in RootLayout state. If you need it deeper in the tree,
 * lift it into a context — but the socket listeners stay here.
 */
export { };
