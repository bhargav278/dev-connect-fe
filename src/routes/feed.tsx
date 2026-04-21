import { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { IconCompass, IconLayoutGrid, IconLayoutList, IconPlus, IconUsers, IconX } from '@tabler/icons-react';
import { postsApi } from '../features/posts/posts.api';
import { CreatePostForm } from '../components/feed/CreatePostForm';
import { FeedList } from '../components/feed/FeedList';
import { PostGrid } from '../components/PostGridModal';
import { userApi } from '../features/user/user.api';

export const Route = createFileRoute('/feed')({
  validateSearch: (search: Record<string, unknown>) => {
    const mode = search.mode === 'explore' ? 'explore' : 'following';
    return { mode };
  },
  component: FeedPage,
});

function FeedPage() {
  const mode = Route.useSearch({ select: (s) => s.mode }) as 'following' | 'explore';
  const [showForm, setShowForm] = useState(false);
  // Desktop only: manual view toggle. Always resets when mode changes.
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(mode === 'explore' ? 'grid' : 'list');
  useEffect(() => {
    setViewMode(mode === 'explore' ? 'grid' : 'list');
    setShowForm(false);
  }, [mode]);

  // On mobile: always list for following, always grid for explore — ignore viewMode state
  const effectiveViewMode = mode === 'explore' ? 'grid' : 'list';

  const feedQuery = useQuery({
    queryKey: ['feed', mode],
    queryFn: () =>
      mode === 'explore'
        ? postsApi.exploreFeed({ page: 1, limit: 20 })
        : postsApi.personalFeed({ page: 1, limit: 20 }),
  });

  const meQuery = useQuery({ queryKey: ['me'], queryFn: userApi.me });

  const canPost = mode !== 'explore';

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ── Desktop-only header controls ── */}
      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Feed</h1>
          <p className="mt-1 text-sm text-zinc-300">Latest posts from people you follow (or explore public posts).</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/3 p-1">
            <Link
              to="/feed"
              search={{ mode: 'following' as const }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white"
              activeProps={{ className: 'flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white' }}
              onClick={() => setViewMode('list')}
            >
              <IconUsers className="size-4 shrink-0" />
              Following
            </Link>
            <Link
              to="/feed"
              search={{ mode: 'explore' as const }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white"
              activeProps={{ className: 'flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white' }}
              onClick={() => setViewMode('grid')}
            >
              <IconCompass className="size-4 shrink-0" />
              Explore
            </Link>
          </div>

          <div className="inline-flex rounded-xl border border-white/10 bg-white/3 p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <IconLayoutList className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <IconLayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop create post button — only in following mode */}
      {canPost ? (
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-400"
        >
          {showForm ? <IconX className="size-4" /> : <IconPlus className="size-4" />}
          {showForm ? 'Cancel' : 'Create post'}
        </button>
      ) : null}

      {/* Create post form — shared between mobile FAB and desktop button */}
      {showForm && canPost ? <CreatePostForm onSuccess={() => setShowForm(false)} /> : null}

      {/* Feed content
          Mobile: effectiveViewMode (locked — following=list, explore=grid)
          Desktop: manual viewMode toggle */}
      {/* Mobile */}
      <div className="sm:hidden">
        {effectiveViewMode === 'grid'
          ? <PostGrid posts={feedQuery.data?.posts ?? []} currentUserId={meQuery.data?.id} />
          : <FeedList feedQuery={feedQuery} mode={mode} />}
      </div>
      {/* Desktop */}
      <div className="hidden sm:block">
        {viewMode === 'grid'
          ? <PostGrid posts={feedQuery.data?.posts ?? []} currentUserId={meQuery.data?.id} />
          : <FeedList feedQuery={feedQuery} mode={mode} />}
      </div>

      {/* Mobile FAB — only in following mode */}
      {canPost ? (
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="fixed bottom-20 right-4 z-30 grid size-14 place-items-center rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 sm:hidden"
          aria-label={showForm ? 'Cancel' : 'Create post'}
        >
          {showForm ? <IconX className="size-6" /> : <IconPlus className="size-6" />}
        </button>
      ) : null}
    </div>
  );
}
