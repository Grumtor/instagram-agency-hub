import { useState } from 'react';
import { X, Search, Clock, LayoutTemplate } from 'lucide-react';
import { useTemplates } from '../../hooks/useTemplates';
import { api } from '../../lib/api';
import { useWorkspace } from '../../hooks/useWorkspace';
import type { PostTemplate } from '../../types';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PostTemplate) => void;
}

export function TemplatePickerDialog({ open, onClose, onSelect }: TemplatePickerDialogProps) {
  const [search, setSearch] = useState('');
  const { currentWorkspace } = useWorkspace();
  const { templates, loading } = useTemplates(search || undefined);

  const handleSelect = async (template: PostTemplate) => {
    // Mark as used (fire and forget — non-blocking)
    if (currentWorkspace) {
      api
        .post(`/api/workspaces/${currentWorkspace.id}/templates/${template.id}/use`)
        .catch(() => {});
    }
    onSelect(template);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900">Choose a Template</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {search ? 'No templates match your search.' : 'No templates saved yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.id}>
                  <button
                    onClick={() => handleSelect(template)}
                    className="w-full text-left rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">{template.name}</span>
                      {template.category && (
                        <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          {template.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{template.caption}</p>
                    {template.hashtags && (
                      <p className="mt-1 text-xs text-indigo-400 line-clamp-1">{template.hashtags}</p>
                    )}
                    {template.lastUsedAt && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        Last used {new Date(template.lastUsedAt).toLocaleDateString()}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
