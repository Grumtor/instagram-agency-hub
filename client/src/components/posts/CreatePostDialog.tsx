import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Video } from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../hooks/useWorkspace';
import { MediaUploader } from './MediaUploader';
import { SchedulePicker } from './SchedulePicker';
import { extractErrorMessage } from '../../lib/errorUtils';
import type { InstagramAccount, Post, PostType } from '../../types';
import { POST_TYPE_LABELS } from '../../lib/constants';

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: InstagramAccount[];
  onCreated: () => void;
  mode?: 'create' | 'edit';
  editPost?: Post;
  onUpdated?: (postId: string, data: Record<string, unknown>) => Promise<void>;
}

const postTypes: PostType[] = ['POST', 'CAROUSEL', 'REEL', 'STORY'];

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isLocalhostUrl(url: string): boolean {
  return url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1');
}

export function CreatePostDialog({
  open,
  onClose,
  accounts,
  onCreated,
  mode = 'create',
  editPost,
  onUpdated,
}: CreatePostDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<PostType>('POST');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localhostWarning, setLocalhostWarning] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const headingId = 'create-post-dialog-title';

  // Pre-fill form in edit mode
  useEffect(() => {
    if (mode === 'edit' && editPost) {
      setAccountId(editPost.igAccountId);
      setType(editPost.type);
      setCaption(editPost.caption || '');
      setScheduledAt(
        editPost.scheduledAt
          ? new Date(editPost.scheduledAt).toISOString().slice(0, 16)
          : ''
      );
      setFiles([]);
      setError('');
      setLocalhostWarning(false);
    }
  }, [mode, editPost]);

  // Build thumbnails from File objects
  useEffect(() => {
    const urls = files.map((file) =>
      file.type.startsWith('video/') ? '' : URL.createObjectURL(file)
    );
    setThumbnails(urls);

    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  // Capture trigger element and focus first focusable element when dialog opens.
  // Return focus to the trigger when dialog closes.
  useEffect(() => {
    if (open) {
      // Capture whatever had focus before the dialog opened
      triggerRef.current = document.activeElement;
      const timer = setTimeout(() => {
        const el = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
        el?.focus();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      // Return focus to the element that triggered the dialog
      const trigger = triggerRef.current;
      if (trigger && typeof (trigger as HTMLElement).focus === 'function') {
        (trigger as HTMLElement).focus();
      }
      triggerRef.current = null;
    }
  }, [open]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap — Tab / Shift+Tab wraps within dialog
      if (e.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS) ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  const resetForm = () => {
    setAccountId('');
    setType('POST');
    setCaption('');
    setFiles([]);
    setScheduledAt('');
    setError('');
    setLocalhostWarning(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

    // C2 — Media required for scheduled posts
    if (mode === 'create' && scheduledAt && files.length === 0) {
      setError('Media is required for scheduled posts');
      return;
    }

    setSubmitting(true);
    setError('');
    setLocalhostWarning(false);

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

      // C1 — Warn if any media URL is localhost
      const allUrls =
        mode === 'edit' && editPost && files.length === 0
          ? editPost.mediaUrls
          : mediaUrls;
      if (allUrls.some(isLocalhostUrl)) {
        setLocalhostWarning(true);
        // Advisory only — do not block
      }

      if (mode === 'edit' && editPost && onUpdated) {
        const updateData: Record<string, unknown> = {
          igAccountId: accountId,
          type,
          caption,
          ...(scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : { scheduledAt: null }),
        };
        if (files.length > 0) {
          updateData.mediaUrls = mediaUrls;
        }
        await onUpdated(editPost.id, updateData);
      } else {
        await api.post(`/api/workspaces/${currentWorkspace.id}/posts`, {
          igAccountId: accountId,
          type,
          caption,
          mediaUrls,
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt).toISOString() }),
        });
        onCreated();
      }

      resetForm();
      onClose();
    } catch (err) {
      setError(
        extractErrorMessage(err, mode === 'edit' ? 'Failed to update post' : 'Failed to create post')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isEdit = mode === 'edit';
  const title = isEdit ? 'Edit Post' : 'Create New Post';
  const submitLabel = isEdit
    ? submitting
      ? 'Saving...'
      : 'Save Changes'
    : submitting
    ? 'Creating...'
    : scheduledAt
    ? 'Schedule Post'
    : 'Save as Draft';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id={headingId} className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
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

          {localhostWarning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              One or more media URLs are not publicly accessible. Publishing may fail.
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

          {/* M1 — Thumbnail previews */}
          {files.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </p>
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                  >
                    {thumbnails[i] ? (
                      <img
                        src={thumbnails[i]}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Video className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${file.name}`}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
