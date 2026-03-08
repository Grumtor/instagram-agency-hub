import { format } from 'date-fns';
import { cn, truncate } from '../../lib/utils';
import { POST_STATUS_CONFIG, POST_TYPE_LABELS } from '../../lib/constants';
import type { Post } from '../../types';

interface RecentActivityProps {
  posts: Post[];
}

export function RecentActivity({ posts }: RecentActivityProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Posts</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-3 text-left font-medium text-gray-600">Caption</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.map((post) => {
              const config = POST_STATUS_CONFIG[post.status] || POST_STATUS_CONFIG.DRAFT;
              return (
                <tr key={post.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3 text-gray-900 max-w-xs truncate">
                    {truncate(post.caption || '(no caption)', 50)}
                  </td>
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {POST_TYPE_LABELS[post.type] || post.type}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        config.bg,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(post.createdAt), 'MMM d, yyyy')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
