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
