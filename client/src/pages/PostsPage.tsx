import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { useAccounts } from '../hooks/useAccounts';
import { PostList } from '../components/posts/PostList';
import { CreatePostDialog } from '../components/posts/CreatePostDialog';
import { POST_STATUS_CONFIG } from '../lib/constants';
import type { PostStatus } from '../types';

export default function PostsPage() {
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('');
  const [accountFilter, setAccountFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { posts, loading, error, refetch } = usePosts({
    status: statusFilter || undefined,
    igAccountId: accountFilter || undefined,
  });
  const { accounts } = useAccounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your Instagram content
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PostStatus | '')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(POST_STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Accounts</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              @{acc.igUsername}
            </option>
          ))}
        </select>
      </div>

      <PostList
        posts={posts}
        loading={loading}
        error={error}
        onRetry={refetch}
        onNewPost={() => setDialogOpen(true)}
      />

      <CreatePostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={accounts}
        onCreated={refetch}
      />
    </div>
  );
}
