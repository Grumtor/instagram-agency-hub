import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../config/database';
import { encrypt } from '../config/encryption';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errors';
import { AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';
import * as metaApi from './metaApi.service';

const OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'business_management',
].join(',');

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

interface OAuthState {
  workspaceId: string;
  userId: string;
  timestamp: number;
}

interface ConnectedAccount {
  id: string;
  igUserId: string;
  igUsername: string;
  profilePicUrl: string | null;
  accountType: string;
}

function signState(payload: OAuthState): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.oauthStateSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyAndDecodeState(state: string): OAuthState {
  const parts = state.split('.');
  if (parts.length !== 2) {
    throw new ValidationError('Invalid OAuth state format');
  }

  const [encoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', config.oauthStateSecret)
    .update(encoded)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new ValidationError('Invalid OAuth state signature');
  }

  const json = Buffer.from(encoded, 'base64url').toString('utf8');
  const payload = JSON.parse(json) as OAuthState;

  const age = Date.now() - payload.timestamp;
  if (age > STATE_MAX_AGE_MS) {
    throw new ValidationError('OAuth state has expired');
  }

  return payload;
}

export function generateAuthUrl(workspaceId: string, userId: string): string {
  const state = signState({
    workspaceId,
    userId,
    timestamp: Date.now(),
  });

  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', config.meta.appId);
  url.searchParams.set('redirect_uri', config.meta.redirectUri);
  url.searchParams.set('scope', OAUTH_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');

  logger.debug({ workspaceId }, 'Generated Instagram OAuth URL');
  return url.toString();
}

export function verifyState(state: string): { workspaceId: string; userId: string } {
  const payload = verifyAndDecodeState(state);
  return { workspaceId: payload.workspaceId, userId: payload.userId };
}

export async function handleCallback(code: string, state: string): Promise<ConnectedAccount[]> {
  const { workspaceId, userId } = verifyState(state);

  logger.info({ workspaceId, userId }, 'Processing Instagram OAuth callback');

  const shortTokenResponse = await metaApi.exchangeCodeForToken(code);

  const longTokenResponse = await metaApi.getLongLivedToken(shortTokenResponse.access_token);
  const longLivedToken = longTokenResponse.access_token;
  const expiresIn = longTokenResponse.expires_in;

  const pages = await metaApi.getUserPages(longLivedToken);
  logger.info({ pageCount: pages.length, workspaceId }, 'Found Facebook pages');

  const connectedAccounts: ConnectedAccount[] = [];

  for (const page of pages) {
    const igBusinessAccount = await metaApi.getInstagramBusinessAccount(page.id, page.access_token);
    if (!igBusinessAccount) {
      continue;
    }

    const profile = await metaApi.getInstagramProfile(igBusinessAccount.id, page.access_token);

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    const encryptedUserToken = encrypt(longLivedToken, config.encryptionKey);
    const encryptedPageToken = encrypt(page.access_token, config.encryptionKey);

    const debugResult = await metaApi.debugToken(longLivedToken);
    const permissions = debugResult.data.scopes?.join(',') ?? '';

    const account = await prisma.instagramAccount.upsert({
      where: { igUserId: igBusinessAccount.id },
      update: {
        workspaceId,
        igUsername: profile.username,
        accessTokenEncrypted: encryptedUserToken.encrypted,
        accessTokenIV: encryptedUserToken.iv,
        accessTokenTag: encryptedUserToken.tag,
        tokenExpiresAt,
        permissions,
        accountType: profile.account_type,
        profilePicUrl: profile.profile_picture_url ?? null,
        isActive: true,
        lastTokenRefresh: new Date(),
        pageId: page.id,
        pageAccessTokenEncrypted: encryptedPageToken.encrypted,
        pageAccessTokenIV: encryptedPageToken.iv,
        pageAccessTokenTag: encryptedPageToken.tag,
      },
      create: {
        workspaceId,
        igUserId: igBusinessAccount.id,
        igUsername: profile.username,
        accessTokenEncrypted: encryptedUserToken.encrypted,
        accessTokenIV: encryptedUserToken.iv,
        accessTokenTag: encryptedUserToken.tag,
        tokenExpiresAt,
        permissions,
        accountType: profile.account_type,
        profilePicUrl: profile.profile_picture_url ?? null,
        isActive: true,
        connectedAt: new Date(),
        lastTokenRefresh: new Date(),
        pageId: page.id,
        pageAccessTokenEncrypted: encryptedPageToken.encrypted,
        pageAccessTokenIV: encryptedPageToken.iv,
        pageAccessTokenTag: encryptedPageToken.tag,
      },
    });

    await createAuditLog(
      workspaceId,
      userId,
      AuditAction.ACCOUNT_CONNECTED,
      'InstagramAccount',
      account.id,
      { igUsername: profile.username, igUserId: igBusinessAccount.id },
    );

    connectedAccounts.push({
      id: account.id,
      igUserId: account.igUserId,
      igUsername: account.igUsername,
      profilePicUrl: account.profilePicUrl,
      accountType: account.accountType,
    });
  }

  logger.info(
    { workspaceId, accountCount: connectedAccounts.length },
    'Instagram OAuth callback completed',
  );

  return connectedAccounts;
}
