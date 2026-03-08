import { FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn, truncate } from '../../lib/utils';
import { POST_STATUS_CONFIG, POST_TYPE_LABELS } from '../../lib/constants';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { ErrorAlert } from '../common/ErrorAlert';
import type { Post } from '../../types';

interface PostListProps {
  posts: Post[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNewPost: () => void;
}

export function PostList({ posts, loading, error, onRetry, onNewPost }: PostListProps) {
  if (loading) return <LoadingSpinner text="Loading posts..." />;
  if (error) return <ErrorAlert message={error} onRetry={onRetry} />;
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No posts yet"
        description="Create your first post to start publishing content."
        action={{ label: 'Create Post', onClick: onNewPost }}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Caption</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Account</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {posts.map((post) => {
            const statusConfig = POST_STATUS_CONFIG[post.status] || POST_STATUS_CONFIG.DRAFT;
            return (
              <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {POST_TYPE_LABELS[post.type] || post.type}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-gray-900 truncate">
                    {truncate(post.caption || '(no caption)', 60)}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {post.igAccount ? `@${post.igAccount.igUsername}` : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      statusConfig.bg,
                      statusConfig.color
                    )}
                  >
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                  {post.publishedAt
                    ? format(new Date(post.publishedAt), 'MMM d, yyyy')
                    : post.scheduledAt
                    ? format(new Date(post.scheduledAt), 'MMM d, yyyy HH:mm')
                    : format(new Date(post.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {post.igPermalink && (
                    <a
                      href={post.igPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
