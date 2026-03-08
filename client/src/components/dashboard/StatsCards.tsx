import { Users, FileText, Clock, CheckCircle, AlertTriangle, Edit3 } from 'lucide-react';
import type { DashboardStats } from '../../types';

interface StatsCardsProps {
  stats: DashboardStats;
}

const cards = [
  {
    key: 'totalAccounts' as const,
    label: 'Total Accounts',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'totalPosts' as const,
    label: 'Total Posts',
    icon: FileText,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    key: 'publishedCount' as const,
    label: 'Published',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    key: 'scheduledCount' as const,
    label: 'Scheduled',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    key: 'draftCount' as const,
    label: 'Drafts',
    icon: Edit3,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
  },
  {
    key: 'failedCount' as const,
    label: 'Failed',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats[card.key]}</p>
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
