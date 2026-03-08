import { Users } from 'lucide-react';
import { AccountCard } from './AccountCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { ErrorAlert } from '../common/ErrorAlert';
import type { InstagramAccount } from '../../types';

interface AccountListProps {
  accounts: InstagramAccount[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onConnect: () => void;
}

export function AccountList({
  accounts,
  loading,
  error,
  onRetry,
  onConnect,
}: AccountListProps) {
  if (loading) return <LoadingSpinner text="Loading accounts..." />;
  if (error) return <ErrorAlert message={error} onRetry={onRetry} />;
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No accounts connected"
        description="Connect your first Instagram account to start managing your content."
        action={{ label: 'Connect Account', onClick: onConnect }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
}
