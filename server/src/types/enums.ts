export const PostType = {
  POST: 'POST',
  STORY: 'STORY',
  REEL: 'REEL',
  CAROUSEL: 'CAROUSEL',
} as const;
export type PostType = (typeof PostType)[keyof typeof PostType];

export const PostStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHING: 'PUBLISHING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

export const MemberRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const MessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const AuditAction = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGGED_IN: 'USER_LOGGED_IN',
  WORKSPACE_CREATED: 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED: 'WORKSPACE_UPDATED',
  WORKSPACE_DELETED: 'WORKSPACE_DELETED',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_ROLE_CHANGED: 'MEMBER_ROLE_CHANGED',
  ACCOUNT_CONNECTED: 'ACCOUNT_CONNECTED',
  ACCOUNT_DISCONNECTED: 'ACCOUNT_DISCONNECTED',
  ACCOUNT_TOKEN_REFRESHED: 'ACCOUNT_TOKEN_REFRESHED',
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  POST_SCHEDULED: 'POST_SCHEDULED',
  POST_PUBLISHED: 'POST_PUBLISHED',
  POST_DELETED: 'POST_DELETED',
  POST_FAILED: 'POST_FAILED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
