import { Users, FileText, Clock, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';
import { Card, Metric, Text, Flex, Grid } from '@tremor/react';
import type { DashboardStats } from '../../types';

interface StatsCardsProps {
  stats: DashboardStats;
}

const cards = [
  {
    key: 'totalAccounts' as const,
    label: 'Total Accounts',
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    key: 'totalPosts' as const,
    label: 'Total Posts',
    icon: FileText,
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  {
    key: 'publishedCount' as const,
    label: 'Published',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    key: 'scheduledCount' as const,
    label: 'Scheduled',
    icon: Clock,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    key: 'draftCount' as const,
    label: 'Drafts',
    icon: Edit3,
    iconColor: 'text-gray-600',
    iconBg: 'bg-gray-100',
  },
  {
    key: 'failedCount' as const,
    label: 'Failed',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <Grid numItems={2} numItemsSm={3} numItemsLg={6} className="gap-4">
      {cards.map((card) => (
        <Card key={card.key} className="p-4">
          <Flex justifyContent="start" alignItems="center" className="gap-3">
            <div className={`rounded-lg p-2.5 ${card.iconBg} shrink-0`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div className="min-w-0">
              <Metric className="text-2xl leading-tight">{stats[card.key]}</Metric>
              <Text className="text-xs truncate">{card.label}</Text>
            </div>
          </Flex>
        </Card>
      ))}
    </Grid>
  );
}
