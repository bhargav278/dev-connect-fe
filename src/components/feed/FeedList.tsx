import type { UseQueryResult } from '@tanstack/react-query';
import { PostCard } from './PostCard';
import type { FeedResponse } from '../../features/posts/posts.api';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

interface FeedListProps {
  feedQuery: UseQueryResult<FeedResponse, Error>;
  mode: 'following' | 'explore';
}

export function FeedList({ feedQuery, mode }: FeedListProps) {
  return (
    <>
      <div className="space-y-4">
        {feedQuery.isError ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-5 text-sm text-zinc-200">
            {getApiErrorMessage(feedQuery.error)}
          </div>
        ) : null}

        {feedQuery.data?.posts?.map((post) => (
          <PostCard key={post.id} post={post} mode={mode} />
        ))}

        {feedQuery.data && feedQuery.data.posts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mx-auto max-w-sm text-sm text-zinc-300">
              No posts yet. Try exploring, or follow a few people.
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
