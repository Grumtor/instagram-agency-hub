import { useState } from 'react';
import { Plus, CalendarRange } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePosts } from '../hooks/usePosts';
import { useAccounts } from '../hooks/useAccounts';
import { PostList } from '../components/posts/PostList';
import { CreatePostDialog } from '../components/posts/CreatePostDialog';
import { POST_STATUS_CONFIG, ROUTES } from '../lib/constants';
import { extractErrorMessage } from '../lib/errorUtils';
import type { Post, PostStatus } from '../types';

const LIMIT = 20;

export default function PostsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('');
  const [accountFilter, setAccountFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [page, setPage] = useState(1);

  const { posts, total, loading, error, refetch, updatePost, deletePost, publishNow } =
    usePosts({
      status: statusFilter || undefined,
      igAccountId: accountFilter || undefined,
      page,
      limit: LIMIT,
    });
  const { accounts } = useAccounts();

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleStatusFilterChange = (value: PostStatus | '') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleAccountFilterChange = (value: string) => {
    setAccountFilter(value);
    setPage(1);
  };

  const handleEdit = (post: Post) => {
    setEditPost(post);
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
      toast.success('Post deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete post'));
    }
  };

  const handlePublishNow = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post && (!post.mediaUrls || post.mediaUrls.length === 0)) {
      toast.error('Media is required to publish');
      return;
    }
    try {
      await publishNow(postId);
      toast.success('Post queued for publishing');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to publish post'));
    }
  };

  const handleUpdated = async (postId: string, data: Record<string, unknown>) => {
    try {
      await updatePost(postId, data as Parameters<typeof updatePost>[1]);
      toast.success('Post updated');
      setEditPost(null);
    } catch (err) {
      throw err; // Let dialog surface its own inline error
    }
  };

  const handleCreated = () => {
    toast.success('Post created successfully');
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your Instagram content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(ROUTES.BULK_SCHEDULE)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <CalendarRange className="h-4 w-4" />
            Bulk Schedule
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value as PostStatus | '')}
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
          onChange={(e) => handleAccountFilterChange(e.target.value)}
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPublishNow={handlePublishNow}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Create dialog */}
      <CreatePostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={accounts}
        onCreated={handleCreated}
      />

      {/* Edit dialog */}
      {editPost && (
        <CreatePostDialog
          open={true}
          onClose={() => setEditPost(null)}
          accounts={accounts}
          onCreated={() => {}}
          mode="edit"
          editPost={editPost}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
