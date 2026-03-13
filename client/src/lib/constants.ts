export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  ACCOUNTS: '/accounts',
  POSTS: '/posts',
  CALENDAR: '/calendar',
  MESSAGES: '/messages',
  AUDIT_LOG: '/audit-log',
  SETTINGS: '/settings',
  TEMPLATES: '/templates',
  NOTIFICATIONS: '/notifications',
  BULK_SCHEDULE: '/bulk-schedule',
  REPORTS: '/reports',
  REPORT_VIEW: '/reports/:reportId',
  SHARED_REPORT: '/shared-report/:token',
} as const;

export const POST_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-100' },
  PUBLISHING: { label: 'Publishing', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  PUBLISHED: { label: 'Published', color: 'text-green-700', bg: 'bg-green-100' },
  FAILED: { label: 'Failed', color: 'text-red-700', bg: 'bg-red-100' },
};

export const POST_TYPE_LABELS: Record<string, string> = {
  POST: 'Photo',
  CAROUSEL: 'Carousel',
  REEL: 'Reel',
  STORY: 'Story',
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

export const TOKEN_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  valid: { label: 'Active', color: 'text-green-700', bg: 'bg-green-100' },
  expiring_soon: { label: 'Expiring Soon', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-100' },
  unknown: { label: 'Unknown', color: 'text-gray-700', bg: 'bg-gray-100' },
};
