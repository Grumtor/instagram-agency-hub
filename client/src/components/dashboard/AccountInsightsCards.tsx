import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, AreaChart, Metric, Text, Flex } from '@tremor/react';
import { api } from '../../lib/api';
import type { AccountInsightSummary } from '../../types';

interface AccountInsightsCardsProps {
  insights: AccountInsightSummary[];
  workspaceId: string;
  onRefreshComplete: () => void;
}

function fmt(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

interface InsightCardProps {
  insight: AccountInsightSummary;
  workspaceId: string;
  onRefreshComplete: () => void;
}

function InsightCard({ insight, workspaceId, onRefreshComplete }: InsightCardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post(
        `/api/workspaces/${workspaceId}/accounts/${insight.igAccountId}/insights/refresh`
      );
      onRefreshComplete();
    } catch {
      toast.error('Failed to refresh insights');
    } finally {
      setRefreshing(false);
    }
  };

  const series = insight.series ?? [];

  // Compute 28-day totals from series for reach/impressions/profileViews
  const totalReach = series.reduce((sum, d) => sum + d.reach, 0);
  const totalImpressions = series.reduce((sum, d) => sum + d.impressions, 0);
  const totalProfileViews = series.reduce((sum, d) => sum + d.profileViews, 0);

  return (
    <Card className="p-5">
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <Text className="font-semibold text-gray-900 truncate text-sm">
          @{insight.igUsername}
        </Text>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh insights"
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </button>
      </Flex>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-4 mb-5 sm:grid-cols-4">
        <div>
          <Text className="text-xs text-gray-500">Followers</Text>
          <Metric className="text-lg leading-tight">{fmt(insight.followerCount)}</Metric>
        </div>
        <div>
          <Text className="text-xs text-gray-500">Reach (28d)</Text>
          <Metric className="text-lg leading-tight">
            {series.length > 0 ? fmt(totalReach) : fmt(insight.reach)}
          </Metric>
        </div>
        <div>
          <Text className="text-xs text-gray-500">Impressions (28d)</Text>
          <Metric className="text-lg leading-tight">
            {series.length > 0 ? fmt(totalImpressions) : fmt(insight.impressions)}
          </Metric>
        </div>
        <div>
          <Text className="text-xs text-gray-500">Profile Views (28d)</Text>
          <Metric className="text-lg leading-tight">
            {series.length > 0 ? fmt(totalProfileViews) : fmt(insight.profileViews)}
          </Metric>
        </div>
      </div>

      {/* 28-day area chart */}
      {series.length > 1 ? (
        <AreaChart
          className="h-28 mt-2"
          data={series}
          index="date"
          categories={['reach', 'impressions']}
          colors={['indigo', 'cyan']}
          showLegend={false}
          showYAxis={false}
          showGridLines={false}
          showXAxis={true}
          curveType="monotone"
          valueFormatter={(v) => fmt(v)}
        />
      ) : (
        <div className="h-28 flex items-center justify-center rounded-lg bg-gray-50 mt-2">
          <Text className="text-xs text-gray-400">No trend data yet</Text>
        </div>
      )}

      {insight.date && (
        <Text className="mt-2 text-[10px] text-gray-400">
          Last updated: {new Date(insight.date).toLocaleDateString()}
        </Text>
      )}
    </Card>
  );
}

export function AccountInsightsCards({
  insights,
  workspaceId,
  onRefreshComplete,
}: AccountInsightsCardsProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Account Analytics</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.igAccountId}
            insight={insight}
            workspaceId={workspaceId}
            onRefreshComplete={onRefreshComplete}
          />
        ))}
      </div>
    </div>
  );
}
