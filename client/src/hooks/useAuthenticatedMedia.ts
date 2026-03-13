import { useState, useEffect } from 'react';
import { fetchAuthenticatedBlob } from '../lib/api';

export function useAuthenticatedMedia(url: string | null | undefined): { src: string | null; loading: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) { setSrc(null); return; }
    // Skip blob fetch for external URLs (not our uploads)
    if (!url.includes('/uploads/')) { setSrc(url); return; }
    let revoke: string | null = null;
    setLoading(true);
    fetchAuthenticatedBlob(url)
      .then((blobUrl) => { revoke = blobUrl; setSrc(blobUrl); })
      .catch(() => setSrc(null))
      .finally(() => setLoading(false));
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [url]);

  return { src, loading };
}
