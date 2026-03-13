import { useState, useEffect, useCallback } from 'react';
import { Save, UserPlus, Settings, Lock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../lib/constants';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { EmptyState } from '../components/common/EmptyState';
import { extractErrorMessage } from '../lib/errorUtils';
import type { WorkspaceMember } from '../types';
import { cn } from '../lib/utils';

type Tab = 'general' | 'members' | 'security';

const TAB_PANEL_ID = (tab: Tab) => `tabpanel-${tab}`;
const TAB_BUTTON_ID = (tab: Tab) => `tab-${tab}`;

export default function SettingsPage() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage workspace settings and team members
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6" role="tablist" aria-label="Settings tabs">
          {(['general', 'members', 'security'] as Tab[]).map((tab) => (
            <button
              key={tab}
              id={TAB_BUTTON_ID(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={TAB_PANEL_ID(tab)}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div
        id={TAB_PANEL_ID('general')}
        role="tabpanel"
        aria-labelledby={TAB_BUTTON_ID('general')}
        hidden={activeTab !== 'general'}
      >
        <GeneralTab
          workspace={currentWorkspace}
          onUpdated={refreshWorkspaces}
        />
      </div>

      <div
        id={TAB_PANEL_ID('members')}
        role="tabpanel"
        aria-labelledby={TAB_BUTTON_ID('members')}
        hidden={activeTab !== 'members'}
      >
        <MembersTab workspaceId={currentWorkspace?.id} />
      </div>

      <div
        id={TAB_PANEL_ID('security')}
        role="tabpanel"
        aria-labelledby={TAB_BUTTON_ID('security')}
        hidden={activeTab !== 'security'}
      >
        <SecurityTab />
      </div>
    </div>
  );
}

function GeneralTab({
  workspace,
  onUpdated,
}: {
  workspace: { id: string; name: string } | null;
  onUpdated: () => Promise<void>;
}) {
  const [name, setName] = useState(workspace?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (workspace?.name) setName(workspace.name);
  }, [workspace?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !name.trim()) return;

    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/workspaces/${workspace.id}`, { name: name.trim() });
      await onUpdated();
      toast.success('Workspace updated');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to update workspace');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!workspace) {
    return (
      <EmptyState
        icon={Settings}
        title="No workspace selected"
        description="Select a workspace to manage its settings."
      />
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Workspace Details
        </h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

function MembersTab({ workspaceId }: { workspaceId?: string }) {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  // Inline confirm state: stores the member.id pending confirmation, or null
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/workspaces/${workspaceId}/members`);
      setMembers(data.members ?? data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !inviteEmail.trim()) return;

    setInviting(true);
    setInviteError('');
    try {
      await api.post(`/api/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      fetchMembers();
      toast.success('Invitation sent');
    } catch (err) {
      const message = extractErrorMessage(err, 'Failed to invite member');
      setInviteError(message);
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: WorkspaceMember, newRole: string) => {
    if (!workspaceId || newRole === member.role) return;
    setUpdatingRoleId(member.id);
    try {
      await api.patch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
        role: newRole,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: newRole as WorkspaceMember['role'] } : m
        )
      );
      toast.success('Role updated');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update role'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveClick = (member: WorkspaceMember) => {
    setConfirmingRemoveId(member.id);
  };

  const handleCancelRemove = () => {
    setConfirmingRemoveId(null);
  };

  const handleConfirmRemove = async (member: WorkspaceMember) => {
    if (!workspaceId) return;
    setConfirmingRemoveId(null);
    setRemovingId(member.id);
    try {
      await api.delete(`/api/workspaces/${workspaceId}/members/${member.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Member removed');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to remove member'));
    } finally {
      setRemovingId(null);
    }
  };

  if (!workspaceId) {
    return (
      <EmptyState
        icon={Settings}
        title="No workspace selected"
        description="Select a workspace to manage members."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Invite Member
        </h3>
        {inviteError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {inviteError}
          </div>
        )}
        <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading members..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={fetchMembers} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((member) => {
                const isCurrentUser = currentUser?.id === member.userId;
                const isOwner = member.role === 'OWNER';
                const isConfirmingRemove = confirmingRemoveId === member.id;
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900">
                      {member.user?.name || '—'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {member.user?.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {isOwner || isCurrentUser ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={updatingRoleId === member.id}
                          onChange={(e) => handleRoleChange(member, e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isCurrentUser && !isOwner && (
                        isConfirmingRemove ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Remove member?</span>
                            <button
                              onClick={() => handleConfirmRemove(member)}
                              disabled={removingId === member.id}
                              className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={handleCancelRemove}
                              className="inline-flex items-center rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRemoveClick(member)}
                            disabled={removingId === member.id}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                            aria-label={`Remove ${member.user?.name || member.user?.email || 'member'}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {removingId === member.id ? 'Removing...' : 'Remove'}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/api/auth/password', { currentPassword, newPassword });
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Change Password
          </h3>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Lock className="h-4 w-4" />
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
