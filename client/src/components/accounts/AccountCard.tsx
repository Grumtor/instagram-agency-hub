import { useState, useEffect, useRef } from 'react';
import { extractErrorMessage } from '../../lib/errorUtils';
import {
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { TOKEN_STATUS_CONFIG } from '../../lib/constants';
import type { InstagramAccount } from '../../types';

interface AccountCardProps {
  account: InstagramAccount;
  canManage?: boolean;
  onDisconnect?: (accountId: string) => Promise<void>;
  onRefreshToken?: (accountId: string) => Promise<void>;
}

const statusIcons: Record<string, React.ElementType> = {
  valid: CheckCircle,
  expiring_soon: Clock,
  expired: XCircle,
  unknown: AlertCircle,
};

export function AccountCard({
  account,
  canManage = false,
  onDisconnect,
  onRefreshToken,
}: AccountCardProps) {
  const tokenStatus = account.tokenStatus || 'unknown';
  const config = TOKEN_STATUS_CONFIG[tokenStatus] || TOKEN_STATUS_CONFIG.unknown;
  const StatusIcon = statusIcons[tokenStatus] || AlertCircle;

  const [showConfirm, setShowConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const refreshSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the refresh-success banner timer on unmount to prevent state updates
  // on an unmounted component (e.g. when the account is disconnected).
  useEffect(() => {
    return () => {
      if (refreshSuccessTimerRef.current !== null) {
        clearTimeout(refreshSuccessTimerRef.current);
      }
    };
  }, []);

  const handleDisconnectClick = () => {
    setActionError(null);
    setShowConfirm(true);
  };

  const handleCancelDisconnect = () => {
    setShowConfirm(false);
  };

  const handleConfirmDisconnect = async () => {
    if (!onDisconnect) return;
    setDisconnecting(true);
    setActionError(null);
    try {
      await onDisconnect(account.id);
      // Card will be removed from list via refetch; no local state update needed
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to disconnect account'));
      setShowConfirm(false);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!onRefreshToken) return;
    setRefreshing(true);
    setActionError(null);
    setRefreshSuccess(false);
    try {
      await onRefreshToken(account.id);
      setRefreshSuccess(true);
      refreshSuccessTimerRef.current = setTimeout(() => setRefreshSuccess(false), 3000);
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Failed to refresh token'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {account.profilePicUrl ? (
          <img
            src={account.profilePicUrl}
            alt={account.igUsername}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <User className="h-6 w-6" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            @{account.igUsername}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            {account.accountType?.toLowerCase() || 'Business'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            config.bg,
            config.color
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {config.label}
        </span>
        <span
          className={cn(
            'text-xs font-medium',
            account.isActive ? 'text-green-600' : 'text-gray-400'
          )}
        >
          {account.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {account.permissions && account.permissions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {account.permissions.slice(0, 3).map((perm) => (
            <span
              key={perm}
              className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {perm}
            </span>
          ))}
          {account.permissions.length > 3 && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              +{account.permissions.length - 3}
            </span>
          )}
        </div>
      )}

      {actionError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      )}

      {refreshSuccess && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          Token refreshed
        </div>
      )}

      {canManage && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {showConfirm ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-700">
                Disconnect @{account.igUsername}?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {disconnecting && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Confirm
                </button>
                <button
                  onClick={handleCancelDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {refreshing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh Token
              </button>
              <button
                onClick={handleDisconnectClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
