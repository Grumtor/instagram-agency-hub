import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../hooks/useWorkspace';
import { MediaUploader } from './MediaUploader';
import { SchedulePicker } from './SchedulePicker';
import type { InstagramAccount, PostType } from '../../types';
import { POST_TYPE_LABELS } from '../../lib/constants';

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: InstagramAccount[];
  onCreated: () => void;
}

const postTypes: PostType[] = ['POST', 'CAROUSEL', 'REEL', 'STORY'];

export function CreatePostDialog({
  open,
  onClose,
  accounts,
  onCreated,
}: CreatePostDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<PostType>('POST');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setAccountId('');
    setType('POST');
    setCaption('');
    setFiles([]);
    setScheduledAt('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    if (!accountId) {
      setError('Please select an account');
      return;
    }
    if (type !== 'STORY' && !caption.trim()) {
      setError('Caption is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let mediaUrls: string[] = [];

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        const { data: uploadData } = await api.post(
          `/api/workspaces/${currentWorkspace.id}/posts/upload-media`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        mediaUrls = uploadData.urls ?? uploadData;
      }

      await api.post(`/api/workspaces/${currentWorkspace.id}/posts`, {
        igAccountId: accountId,
        type,
        caption,
        mediaUrls,
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt).toISOString() }),
      });

      resetForm();
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Post</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select an account...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.igUsername}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Post Type
            </label>
            <div className="flex flex-wrap gap-2">
              {postTypes.map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setType(pt)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === pt
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {POST_TYPE_LABELS[pt]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Caption{type === 'STORY' ? ' (optional)' : ''}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Write your caption..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <MediaUploader files={files} onChange={setFiles} />

          <SchedulePicker value={scheduledAt} onChange={setScheduledAt} />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : scheduledAt ? 'Schedule Post' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
