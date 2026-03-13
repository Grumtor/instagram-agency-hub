import { useWorkspace } from './useWorkspace';
import type { MemberRole } from '../types';

/**
 * Returns the current user's role in the current workspace.
 *
 * The role is sourced directly from the Workspace object returned by the
 * server's GET /workspaces endpoint (which already includes `role: m.role`
 * for the authenticated user). No additional API call is needed.
 */
export function useCurrentMemberRole(): { role: MemberRole | null; loading: boolean } {
  const { currentWorkspace, isLoading } = useWorkspace();

  return {
    role: currentWorkspace?.role ?? null,
    loading: isLoading,
  };
}
