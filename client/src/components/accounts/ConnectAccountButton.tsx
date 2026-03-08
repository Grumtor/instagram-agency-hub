import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../hooks/useWorkspace';

export function ConnectAccountButton() {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/instagram/auth-url', {
        params: { workspaceId: currentWorkspace.id },
      });
      window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      <Plus className="h-4 w-4" />
      {loading ? 'Connecting...' : 'Connect Instagram Account'}
    </button>
  );
}
