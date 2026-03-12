import { useDashboard } from '../hooks/useDashboard';
import { useWorkspace } from '../hooks/useWorkspace';
import { StatsCards } from '../components/dashboard/StatsCards';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { AccountInsightsCards } from '../components/dashboard/AccountInsightsCards';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorAlert } from '../components/common/ErrorAlert';

export default function DashboardPage() {
  const { stats, loading, error, refetch } = useDashboard();
  const { currentWorkspace } = useWorkspace();

  return (
    <div className="space-y-8">
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
          <section>
            <StatsCards stats={stats} />
          </section>

          {stats.accountInsights.length > 0 && (
            <section>
              <AccountInsightsCards
                insights={stats.accountInsights}
                workspaceId={currentWorkspace!.id}
                onRefreshComplete={refetch}
              />
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Activity</h2>
            <RecentActivity posts={stats.recentPosts} />
          </section>
        </>
      )}
    </div>
  );
}
