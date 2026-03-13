import { useState } from 'react';
import { FileText, ExternalLink, Pencil, Send, Trash2 } from 'lucide-react';
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
  onEdit: (post: Post) => void;
  onDelete: (postId: string) => Promise<void>;
  onPublishNow: (postId: string) => Promise<void>;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PostList({
  posts,
  loading,
  error,
  onRetry,
  onNewPost,
  onEdit,
  onDelete,
  onPublishNow,
  page,
  totalPages,
  onPageChange,
}: PostListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const isEditable = (status: string) =>
    status === 'DRAFT' || status === 'SCHEDULED';

  const handleDeleteClick = (postId: string) => {
    if (deletingId === postId) {
      // Second click — confirm deletion
      setActionLoading(postId);
      onDelete(postId).finally(() => {
        setDeletingId(null);
        setActionLoading(null);
      });
    } else {
      setDeletingId(postId);
    }
  };

  const handlePublishNow = (postId: string) => {
    setActionLoading(postId);
    onPublishNow(postId).finally(() => setActionLoading(null));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Caption</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Account</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Engagement</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => {
              const statusConfig =
                POST_STATUS_CONFIG[post.status] || POST_STATUS_CONFIG.DRAFT;
              const editable = isEditable(post.status);
              const isDeleting = deletingId === post.id;
              const isActing = actionLoading === post.id;

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
                    {/* C5 — Error message for FAILED posts */}
                    {post.status === 'FAILED' && post.errorMessage && (
                      <p
                        className="mt-0.5 truncate text-xs text-red-600"
                        title={post.errorMessage}
                      >
                        {truncate(post.errorMessage, 80)}
                      </p>
                    )}
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
                  {/* H6.7 — Engagement column */}
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                    {post.status === 'PUBLISHED' ? (
                      post.insight ? (
                        <span>
                          ♥ {post.insight.likeCount}&nbsp;&nbsp;
                          💬 {post.insight.commentCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), 'MMM d, yyyy')
                      : post.scheduledAt
                      ? format(new Date(post.scheduledAt), 'MMM d, yyyy HH:mm')
                      : format(new Date(post.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {/* View link for published posts */}
                      {post.igPermalink && (
                        <a
                          href={post.igPermalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      )}

                      {/* Edit button — DRAFT/SCHEDULED only */}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => onEdit(post)}
                          disabled={isActing}
                          title="Edit post"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Publish Now button — DRAFT/SCHEDULED only */}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => handlePublishNow(post.id)}
                          disabled={isActing}
                          title="Publish now"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 disabled:opacity-40"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Delete button — DRAFT/SCHEDULED only */}
                      {editable && (
                        <>
                          {isDeleting ? (
                            <span className="flex items-center gap-1 text-xs">
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(post.id)}
                                disabled={isActing}
                                className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                              >
                                Confirm?
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="rounded px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(post.id)}
                              disabled={isActing}
                              title="Delete post"
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* M8 — Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-sm text-gray-600">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
