import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccounts } from '../hooks/useAccounts';
import { AccountList } from '../components/accounts/AccountList';
import { ConnectAccountButton } from '../components/accounts/ConnectAccountButton';

export default function AccountsPage() {
  const { accounts, loading, error, refetch } = useAccounts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const errorParam = searchParams.get('error');

    if (connected) {
      const count = parseInt(connected, 10);
      if (!isNaN(count) && count > 0) {
        setSuccessMessage(
          `Successfully connected ${count} Instagram account${count > 1 ? 's' : ''}`
        );
      }
      setSearchParams({}, { replace: true });
    } else if (errorParam) {
      if (errorParam === 'no_instagram_account') {
        setErrorMessage(
          'No Instagram Business account was found linked to your Facebook Pages. Please ensure your Instagram account is converted to a Business or Creator account and linked to a Facebook Page.'
        );
      } else {
        setErrorMessage(decodeURIComponent(errorParam));
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = () => {
    const btn = document.querySelector<HTMLButtonElement>('[data-connect-btn]');
    btn?.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comptes Instagram</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos comptes Instagram connectés. La connexion passe par Facebook (exigé par Instagram pour les comptes Pro).
          </p>
        </div>
        <ConnectAccountButton />
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-500 hover:text-green-700 text-lg leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">Connection Error</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 text-lg leading-none"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

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
