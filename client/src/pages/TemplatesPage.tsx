import { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Hash,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTemplates, useHashtagSets } from '../hooks/useTemplates';
import { extractErrorMessage } from '../lib/errorUtils';
import type { PostTemplate, HashtagSet } from '../types';

// ─── Category list ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Product Launches',
  'Promotions',
  'Behind the Scenes',
  'User Generated Content',
  'Announcements',
  'Seasonal',
  'Testimonials',
  'Educational',
  'Other',
];

// ─── Template Modal ────────────────────────────────────────────────────────────

interface TemplateModalProps {
  open: boolean;
  onClose: () => void;
  template?: PostTemplate | null;
  onSave: (data: {
    name: string;
    caption: string;
    hashtags?: string;
    category?: string;
  }) => Promise<void>;
}

function TemplateModal({ open, onClose, template, onSave }: TemplateModalProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [caption, setCaption] = useState(template?.caption ?? '');
  const [hashtags, setHashtags] = useState(template?.hashtags ?? '');
  const [category, setCategory] = useState(template?.category ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset when template changes (edit vs create)
  const isEdit = Boolean(template);
  const title = isEdit ? 'Edit Template' : 'New Template';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!caption.trim()) { setError('Caption is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        caption: caption.trim(),
        hashtags: hashtags.trim() || undefined,
        category: category.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save template'));
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
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Launch"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Caption <span className="text-red-500">*</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              placeholder="Write your caption template..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">{caption.length} / 2200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hashtags
            </label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#launch #product #new"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-400">Separate with spaces. Will be appended to the caption when used.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">No category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

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
              {submitting ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Hashtag Set Modal ─────────────────────────────────────────────────────────

interface HashtagSetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; hashtags: string }) => Promise<void>;
}

function HashtagSetModal({ open, onClose, onSave }: HashtagSetModalProps) {
  const [name, setName] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!hashtags.trim()) { setError('Hashtags are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSave({ name: name.trim(), hashtags: hashtags.trim() });
      setName('');
      setHashtags('');
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save hashtag set'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">New Hashtag Set</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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
              Set Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Tags"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hashtags <span className="text-red-500">*</span>
            </label>
            <textarea
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              rows={3}
              placeholder="#product #new #shop #trending"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : 'Save Set'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Template Card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: PostTemplate;
  onEdit: (template: PostTemplate) => void;
  onDelete: (templateId: string) => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const formattedDate = template.lastUsedAt
    ? new Date(template.lastUsedAt).toLocaleDateString()
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h3>
          {template.category && (
            <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {template.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(template)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Edit template"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Delete template"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{template.caption}</p>

      {template.hashtags && (
        <p className="mt-2 text-xs text-indigo-500 line-clamp-2">{template.hashtags}</p>
      )}

      {formattedDate && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          Last used {formattedDate}
        </div>
      )}
    </div>
  );
}

// ─── Hashtag Set Card ──────────────────────────────────────────────────────────

interface HashtagSetCardProps {
  set: HashtagSet;
  onDelete: (setId: string) => void;
}

function HashtagSetCard({ set, onDelete }: HashtagSetCardProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-900">{set.name}</span>
        </div>
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{set.hashtags}</p>
      </div>
      <button
        onClick={() => onDelete(set.id)}
        className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Delete hashtag set"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [hashtagSetModalOpen, setHashtagSetModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null);
  const [hashtagSetsExpanded, setHashtagSetsExpanded] = useState(true);

  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, refetch } =
    useTemplates(debouncedSearch || undefined);
  const { hashtagSets, createHashtagSet, deleteHashtagSet } = useHashtagSets();

  // Simple debounce via input blur / enter, or just use state directly
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    // Simple debounce: update after typing stops
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredTemplates = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTemplateModalOpen(true);
  };

  const handleOpenEdit = (template: PostTemplate) => {
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (data: {
    name: string;
    caption: string;
    hashtags?: string;
    category?: string;
  }) => {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, data);
      toast.success('Template updated');
    } else {
      await createTemplate(data);
      toast.success('Template created');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await deleteTemplate(templateId);
      toast.success('Template deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete template'));
    }
  };

  const handleSaveHashtagSet = async (data: { name: string; hashtags: string }) => {
    await createHashtagSet(data);
    toast.success('Hashtag set created');
  };

  const handleDeleteHashtagSet = async (setId: string) => {
    if (!confirm('Delete this hashtag set?')) return;
    try {
      await deleteHashtagSet(setId);
      toast.success('Hashtag set deleted');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete hashtag set'));
    }
  };

  // Collect distinct categories from existing templates
  const existingCategories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Save and reuse caption templates for faster content creation
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search templates..."
          className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Category filter tabs */}
      {existingCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('')}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeCategory === ''
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {existingCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? '' : cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Templates grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading templates...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={refetch} className="ml-2 underline">Retry</button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500 mb-4">
            {search ? 'No templates match your search.' : 'No templates yet. Create your first one!'}
          </p>
          {!search && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      {/* Hashtag Sets section */}
      <div className="border-t border-gray-200 pt-6">
        <button
          onClick={() => setHashtagSetsExpanded((v) => !v)}
          className="flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
        >
          {hashtagSetsExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
          <Hash className="h-5 w-5 text-indigo-500" />
          Hashtag Sets
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {hashtagSets.length}
          </span>
        </button>

        {hashtagSetsExpanded && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setHashtagSetModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Hashtag Set
              </button>
            </div>

            {hashtagSets.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
                <p className="text-sm text-gray-500">No hashtag sets yet. Save groups of hashtags for quick reuse.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hashtagSets.map((set) => (
                  <HashtagSetCard key={set.id} set={set} onDelete={handleDeleteHashtagSet} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Modal */}
      <TemplateModal
        open={templateModalOpen}
        onClose={() => {
          setTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />

      {/* Hashtag Set Modal */}
      <HashtagSetModal
        open={hashtagSetModalOpen}
        onClose={() => setHashtagSetModalOpen(false)}
        onSave={handleSaveHashtagSet}
      />
    </div>
  );
}
