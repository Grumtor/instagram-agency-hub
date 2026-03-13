import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, Key, TrendingUp, Info, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { cn } from '../lib/utils';
import type { Notification, NotificationType } from '../types';

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'post_failed', label: 'Post Failed' },
  { value: 'token_expiring', label: 'Token Expiring' },
  { value: 'engagement_spike', label: 'Engagement Spike' },
  { value: 'system', label: 'System' },
] as const;

const TYPE_CONFIG: Record<NotificationType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  post_failed: { label: 'Post Failed', color: 'text-red-700', bg: 'bg-red-100', Icon: AlertCircle },
  token_expiring: { label: 'Token Expiring', color: 'text-yellow-700', bg: 'bg-yellow-100', Icon: Key },
  engagement_spike: { label: 'Engagement Spike', color: 'text-green-700', bg: 'bg-green-100', Icon: TrendingUp },
  system: { label: 'System', color: 'text-blue-700', bg: 'bg-blue-100', Icon: Info },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
  const { Icon } = config;

  const handleClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div
      onClick={handleClick}
      role={notification.link ? 'button' : undefined}
      tabIndex={notification.link ? 0 : undefined}
      onKeyDown={notification.link ? (e) => { if (e.key === 'Enter') handleClick(); } : undefined}
      className={cn(
        'flex gap-4 p-4 border-b border-gray-100 last:border-0 transition-colors',
        notification.link ? 'cursor-pointer hover:bg-gray-50' : '',
        !notification.read && 'bg-indigo-50/40',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn('text-sm text-gray-900', !notification.read && 'font-semibold')}>
              {notification.title}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-indigo-500" aria-label="Unread" />
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(notification.createdAt)}</span>
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.color)}>
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { notifications, pagination, loading, error, refetch, markAsRead, markAllAsRead, unreadCount } =
    useNotifications({ page, limit: LIMIT, type: typeFilter || undefined });

  const handleFilterChange = (type: string) => {
    setTypeFilter(type);
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay informed about posts, tokens, and engagement
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by type">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={typeFilter === f.value}
              onClick={() => handleFilterChange(f.value)}
              className={cn(
                'pb-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                typeFilter === f.value
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Notifications list */}
      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            {typeFilter ? `No ${typeFilter.replace('_', ' ')} notifications found.` : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onRead={markAsRead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
