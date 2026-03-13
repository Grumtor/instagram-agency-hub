export interface User {
  id: string;
  email: string;
  name: string;
}

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  role: MemberRole;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  user?: User;
}

export interface InstagramAccount {
  id: string;
  igUserId: string;
  igUsername: string;
  accountType: string;
  profilePicUrl?: string;
  isActive: boolean;
  connectedAt: string;
  permissions: string[];
  tokenStatus?: 'valid' | 'expiring_soon' | 'expired' | 'unknown';
}

export interface PostInsightSummary {
  likeCount: number;
  commentCount: number;
  savedCount: number;
  engagementRate: number;
}

export interface AccountInsightDataPoint {
  date: string;
  impressions: number;
  reach: number;
  profileViews: number;
  followerCount: number;
}

export interface AccountInsightSummary {
  igAccountId: string;
  igUsername: string;
  followerCount: number | null;
  reach: number | null;
  impressions: number | null;
  profileViews: number | null;
  date: string | null;
  series?: AccountInsightDataPoint[];
}

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
export type PostType = 'POST' | 'STORY' | 'REEL' | 'CAROUSEL';

export interface Post {
  id: string;
  workspaceId: string;
  igAccountId: string;
  type: PostType;
  caption: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: PostStatus;
  igPostId?: string;
  igPermalink?: string;
  errorMessage?: string | null;
  retryCount: number;
  createdBy?: User;
  igAccount?: InstagramAccount;
  insight?: PostInsightSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  user?: User;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: Array<{ username: string; id: string }>;
  messages?: MessageItem[];
}

export interface MessageItem {
  id: string;
  message: string;
  from: { username: string; id: string };
  to?: { data: Array<{ username: string; id: string }> };
  created_time: string;
}

export interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalPosts: number;
  scheduledCount: number;
  publishedCount: number;
  failedCount: number;
  draftCount: number;
  recentPosts: Post[];
  accountInsights: AccountInsightSummary[];
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface PostTemplate {
  id: string;
  workspaceId: string;
  name: string;
  caption: string;
  hashtags?: string | null;
  category?: string | null;
  lastUsedAt?: string | null;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface HashtagSet {
  id: string;
  workspaceId: string;
  name: string;
  hashtags: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'post_failed' | 'token_expiring' | 'engagement_spike' | 'system';

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string | null;
  userId: string;
  workspaceId: string;
  postFailed: boolean;
  tokenExpiring: boolean;
  engagementSpike: boolean;
}

export interface TopPost {
  postId: string;
  igPostId: string | null;
  igPermalink: string | null;
  caption: string | null;
  publishedAt: string | null;
  likeCount: number;
  commentCount: number;
  savedCount: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

export interface AccountReportSection {
  accountId: string;
  igUsername: string;
  totalReach: number;
  totalImpressions: number;
  totalProfileViews: number;
  followerStart: number;
  followerEnd: number;
  dataAvailable: boolean;
  suggestion?: string;
  topPosts: TopPost[];
  series: Array<{
    date: string;
    reach: number;
    impressions: number;
    profileViews: number;
    followerCount: number;
  }>;
}

export interface ReportData {
  title: string;
  workspaceId: string;
  accountIds: string[];
  startDate: string;
  endDate: string;
  generatedAt: string;
  sections: AccountReportSection[];
  aggregateSummary: {
    totalReach: number;
    totalImpressions: number;
    totalProfileViews: number;
    totalTopPosts: TopPost[];
  };
}

export interface Report {
  id: string;
  workspaceId: string;
  title: string;
  accountIds: string[];
  startDate: string;
  endDate: string;
  data: ReportData;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface ReportListItem {
  id: string;
  title: string;
  accountIds: string[];
  startDate: string;
  endDate: string;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
}
