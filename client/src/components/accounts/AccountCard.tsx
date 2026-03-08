import { User, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TOKEN_STATUS_CONFIG } from '../../lib/constants';
import type { InstagramAccount } from '../../types';

interface AccountCardProps {
  account: InstagramAccount;
}

const statusIcons: Record<string, React.ElementType> = {
  valid: CheckCircle,
  expiring_soon: Clock,
  expired: XCircle,
  unknown: AlertCircle,
};

export function AccountCard({ account }: AccountCardProps) {
  const tokenStatus = account.tokenStatus || 'unknown';
  const config = TOKEN_STATUS_CONFIG[tokenStatus] || TOKEN_STATUS_CONFIG.unknown;
  const StatusIcon = statusIcons[tokenStatus] || AlertCircle;

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
    </div>
  );
}
