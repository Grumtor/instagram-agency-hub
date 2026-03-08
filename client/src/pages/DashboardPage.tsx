import { useDashboard } from '../hooks/useDashboard';
import { StatsCards } from '../components/dashboard/StatsCards';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';

export default function DashboardPage() {
  const { stats, loading, error, refetch } = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your Instagram accounts and content
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading dashboard..." />
      ) : error ? (
        <ErrorAlert message={error} onRetry={refetch} />
      ) : (
        <>
          <StatsCards stats={stats} />
          <RecentActivity posts={stats.recentPosts} />
        </>
      )}
    </div>
  );
}
