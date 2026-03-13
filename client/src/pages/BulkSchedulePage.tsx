import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, Image, CheckCircle, XCircle, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBulkSchedule, type PreviewPost } from '../hooks/useBulkSchedule';
import { useAccounts } from '../hooks/useAccounts';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ROUTES } from '../lib/constants';

type Tab = 'csv' | 'media';

// ---------------------------------------------------------------------------
// CSV Upload Section
// ---------------------------------------------------------------------------

interface CsvSectionProps {
  onDownloadTemplate: () => Promise<void>;
  onUpload: (file: File) => void;
  loading: boolean;
}

function CsvUploadSection({ onDownloadTemplate, onUpload, loading }: CsvSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDownloadClick = async () => {
    try {
      await onDownloadTemplate();
      toast.success('Template downloaded');
    } catch {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownloadClick}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
        <span className="text-sm text-gray-500">Start from a pre-filled template with your accounts</span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
      >
        <FileText className="h-10 w-10 text-gray-400 mb-3" />
        {selectedFile ? (
          <p className="text-sm font-medium text-indigo-700">{selectedFile.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700">Drop your CSV here or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Only .csv files, max 5 MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      <button
        disabled={!selectedFile || loading}
        onClick={() => selectedFile && onUpload(selectedFile)}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload CSV
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media Upload Section
// ---------------------------------------------------------------------------

interface MediaSectionProps {
  accounts: Array<{ id: string; igUsername: string }>;
  onUpload: (files: File[], accountId: string, startDate: string) => void;
  loading: boolean;
}

function MediaUploadSection({ accounts, onUpload, loading }: MediaSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    if (arr.length < files.length) {
      toast.error('Some files were skipped — only images and videos are allowed');
    }
    setSelectedFiles((prev) => {
      const combined = [...prev, ...arr];
      if (combined.length > 100) {
        toast.error('Maximum 100 files per batch');
        return combined.slice(0, 100);
      }
      return combined;
    });
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!selectedFiles.length) { toast.error('Select at least one file'); return; }
    if (!accountId) { toast.error('Select an account'); return; }
    if (!startDate) { toast.error('Select a start date'); return; }
    onUpload(selectedFiles, accountId, startDate);
  };

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
        }`}
      >
        <Image className="h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Drop images/videos or click to browse</p>
        <p className="text-xs text-gray-500 mt-1">Up to 100 files — one post per file, auto-spaced 1 day apart</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-gray-700 truncate max-w-xs">{f.name}</span>
              <button
                onClick={() => handleRemoveFile(i)}
                className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                aria-label="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select account...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                @{a.igUsername}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Preview Posts
          </>
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Table
// ---------------------------------------------------------------------------

interface PreviewTableProps {
  posts: PreviewPost[];
  accounts: Array<{ id: string; igUsername: string }>;
  onUpdatePost: (idx: number, updates: Partial<PreviewPost>) => void;
  onRemovePost: (idx: number) => void;
  onConfirm: () => void;
  loading: boolean;
}

function PreviewTable({ posts, accounts, onUpdatePost, onRemovePost, onConfirm, loading }: PreviewTableProps) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.igUsername]));

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
        No posts to preview
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{posts.length} post{posts.length !== 1 ? 's' : ''} ready to schedule</h3>
        <button
          disabled={loading}
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Confirm All
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Caption</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {posts.map((post, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  @{accountMap.get(post.igAccountId) ?? post.igAccountId}
                </td>
                <td className="px-4 py-3 min-w-[200px]">
                  <textarea
                    value={post.caption}
                    onChange={(e) => onUpdatePost(idx, { caption: e.target.value })}
                    placeholder="Add a caption..."
                    rows={2}
                    className="w-full resize-none rounded border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {new Date(post.scheduledAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {post.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onRemovePost(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Summary
// ---------------------------------------------------------------------------

interface ResultsSummaryProps {
  createdCount: number;
  errors?: Array<{ line: number; reason: string }>;
  warning?: string;
  onReset: () => void;
}

function ResultsSummary({ createdCount, errors, warning, onReset }: ResultsSummaryProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-green-500" />
        <h3 className="text-base font-semibold text-gray-900">
          {createdCount} post{createdCount !== 1 ? 's' : ''} scheduled
        </h3>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <span className="text-sm text-yellow-800">{warning}</span>
        </div>
      )}

      {errors && errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-400" />
            {errors.length} row{errors.length !== 1 ? 's' : ''} had errors:
          </p>
          <ul className="max-h-48 overflow-y-auto space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-sm text-red-700 bg-red-50 rounded px-3 py-1">
                Line {e.line}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Schedule more posts
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BulkSchedulePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('csv');
  const [previewPosts, setPreviewPosts] = useState<PreviewPost[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const { accounts } = useAccounts();

  const {
    csvLoading, csvError, csvResult,
    downloadTemplate, uploadCsv, resetCsv,
    mediaLoading, mediaError, mediaPreview,
    uploadMedia, resetMedia,
    confirmLoading, confirmError, confirmResult,
    confirmBulk, resetConfirm,
    setMediaPreview,
  } = useBulkSchedule();

  // When CSV result arrives, show result panel
  const handleCsvUpload = async (file: File) => {
    await uploadCsv(file);
    setShowResult(true);
    setShowPreview(false);
  };

  // When media preview arrives, populate preview table
  const handleMediaUpload = async (files: File[], accountId: string, startDate: string) => {
    await uploadMedia(files, accountId, startDate);
    setShowPreview(true);
    setShowResult(false);
  };

  // Update media preview after it loads
  const handlePreviewLoaded = () => {
    if (mediaPreview) {
      setPreviewPosts(mediaPreview.posts);
    }
  };

  // Run on every mediaPreview change
  if (mediaPreview && showPreview && previewPosts.length === 0 && mediaPreview.posts.length > 0) {
    setPreviewPosts(mediaPreview.posts);
  }

  const handleUpdatePost = (idx: number, updates: Partial<PreviewPost>) => {
    setPreviewPosts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)),
    );
  };

  const handleRemovePost = (idx: number) => {
    setPreviewPosts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirm = async () => {
    await confirmBulk(previewPosts);
    setShowResult(true);
    setShowPreview(false);
  };

  const handleReset = () => {
    resetCsv();
    resetMedia();
    resetConfirm();
    setPreviewPosts([]);
    setShowPreview(false);
    setShowResult(false);
    setMediaPreview(null);
  };

  // void ref to prevent unused-variable warnings
  void handlePreviewLoaded;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(ROUTES.POSTS)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Schedule</h1>
        <p className="text-sm text-gray-500 mt-1">
          Schedule multiple posts at once via CSV import or multi-media upload
        </p>
      </div>

      {/* Show result if we have one */}
      {showResult && (csvResult || confirmResult) && (
        <ResultsSummary
          createdCount={csvResult?.createdCount ?? confirmResult?.createdCount ?? 0}
          errors={csvResult?.errors}
          warning={csvResult?.warning}
          onReset={handleReset}
        />
      )}

      {/* Show preview table for media batch */}
      {showPreview && !showResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Preview &amp; Edit</h2>
          <PreviewTable
            posts={previewPosts}
            accounts={accounts}
            onUpdatePost={handleUpdatePost}
            onRemovePost={handleRemovePost}
            onConfirm={handleConfirm}
            loading={confirmLoading}
          />
          {confirmError && (
            <p className="mt-3 text-sm text-red-600">{confirmError}</p>
          )}
        </div>
      )}

      {/* Upload panel — hide after success */}
      {!showResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => { setActiveTab('csv'); setShowPreview(false); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'csv'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              CSV Upload
            </button>
            <button
              onClick={() => { setActiveTab('media'); setShowPreview(false); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'media'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Multi-Media Upload
            </button>
          </div>

          {activeTab === 'csv' && (
            <>
              <CsvUploadSection
                onDownloadTemplate={downloadTemplate}
                onUpload={handleCsvUpload}
                loading={csvLoading}
              />
              {csvError && (
                <p className="text-sm text-red-600">{csvError}</p>
              )}
            </>
          )}

          {activeTab === 'media' && (
            <>
              <MediaUploadSection
                accounts={accounts}
                onUpload={handleMediaUpload}
                loading={mediaLoading}
              />
              {mediaError && (
                <p className="text-sm text-red-600">{mediaError}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Global loading fallback for initial media preview */}
      {mediaLoading && !showPreview && (
        <LoadingSpinner text="Uploading files and generating preview..." />
      )}
    </div>
  );
}
