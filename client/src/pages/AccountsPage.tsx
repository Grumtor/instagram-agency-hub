import { useAccounts } from '../hooks/useAccounts';
import { AccountList } from '../components/accounts/AccountList';
import { ConnectAccountButton } from '../components/accounts/ConnectAccountButton';

export default function AccountsPage() {
  const { accounts, loading, error, refetch } = useAccounts();

  const handleConnect = () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-connect-btn]');
    btn?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instagram Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your connected Instagram accounts
          </p>
        </div>
        <ConnectAccountButton />
      </div>

      <AccountList
        accounts={accounts}
        loading={loading}
        error={error}
        onRetry={refetch}
        onConnect={handleConnect}
      />
    </div>
  );
}
