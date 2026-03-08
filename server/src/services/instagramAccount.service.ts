import { prisma } from '../config/database';
import { config } from '../config';
import { encrypt, decrypt } from '../config/encryption';
import { NotFoundError } from '../utils/errors';
import { AuditAction } from '../types/enums';
import { logger } from '../utils/logger';
import { createAuditLog } from './auditLog.service';
import * as metaApi from './metaApi.service';

interface InstagramAccountSafe {
  id: string;
  igUserId: string;
  igUsername: string;
  accountType: string;
  profilePicUrl: string | null;
  isActive: boolean;
  connectedAt: Date;
  tokenExpiresAt: Date | null;
  lastTokenRefresh: Date | null;
  pageId: string | null;
}

type TokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown';

interface InstagramAccountWithStatus extends InstagramAccountSafe {
  tokenStatus: TokenStatus;
  permissions: string[];
  mediaCount?: number;
  followersCount?: number;
}

function toSafeAccount(account: {
  id: string;
  igUserId: string;
  igUsername: string;
  accountType: string;
  profilePicUrl: string | null;
  isActive: boolean;
  connectedAt: Date;
  tokenExpiresAt: Date | null;
  lastTokenRefresh: Date | null;
  pageId: string | null;
}): InstagramAccountSafe {
  return {
    id: account.id,
    igUserId: account.igUserId,
    igUsername: account.igUsername,
    accountType: account.accountType,
    profilePicUrl: account.profilePicUrl,
    isActive: account.isActive,
    connectedAt: account.connectedAt,
    tokenExpiresAt: account.tokenExpiresAt,
    lastTokenRefresh: account.lastTokenRefresh,
    pageId: account.pageId,
  };
}

export async function getAccounts(workspaceId: string): Promise<InstagramAccountSafe[]> {
  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId },
    orderBy: { connectedAt: 'desc' },
  });

  return accounts.map(toSafeAccount);
}

export async function getAccountById(
  accountId: string,
  workspaceId: string,
): Promise<InstagramAccountWithStatus> {
  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, workspaceId },
  });

  if (!account) {
    throw new NotFoundError('Instagram account');
  }

  let tokenStatus: TokenStatus = 'unknown';

  try {
    const accessToken = decrypt(
      account.accessTokenEncrypted,
      account.accessTokenIV,
      account.accessTokenTag,
      config.encryptionKey,
    );

    const debugResult = await metaApi.debugToken(accessToken);
    const debugData = debugResult.data;

    if (!debugData.is_valid) {
      tokenStatus = 'expired';
    } else {
      const expiresAt = debugData.expires_at * 1000;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (expiresAt - Date.now() < sevenDaysMs) {
        tokenStatus = 'expiring_soon';
      } else {
        tokenStatus = 'valid';
      }
    }
  } catch (error) {
    logger.warn({ accountId, error }, 'Failed to check token status via debug_token');
    if (account.tokenExpiresAt) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (account.tokenExpiresAt.getTime() < Date.now()) {
        tokenStatus = 'expired';
      } else if (account.tokenExpiresAt.getTime() - Date.now() < sevenDaysMs) {
        tokenStatus = 'expiring_soon';
      } else {
        tokenStatus = 'valid';
      }
    }
  }

  return {
    ...toSafeAccount(account),
    tokenStatus,
    permissions: account.permissions ? account.permissions.split(',') : [],
  };
}

export async function disconnectAccount(
  accountId: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, workspaceId },
  });

  if (!account) {
    throw new NotFoundError('Instagram account');
  }

  await prisma.instagramAccount.delete({
    where: { id: accountId },
  });

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.ACCOUNT_DISCONNECTED,
    'InstagramAccount',
    accountId,
    { igUsername: account.igUsername, igUserId: account.igUserId },
  );

  logger.info({ accountId, igUsername: account.igUsername, workspaceId }, 'Instagram account disconnected');
}

export async function refreshAccountToken(
  accountId: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, workspaceId },
  });

  if (!account) {
    throw new NotFoundError('Instagram account');
  }

  const currentToken = decrypt(
    account.accessTokenEncrypted,
    account.accessTokenIV,
    account.accessTokenTag,
    config.encryptionKey,
  );

  const refreshedResult = await metaApi.refreshLongLivedToken(currentToken);
  const newTokenExpiresAt = new Date(Date.now() + refreshedResult.expires_in * 1000);

  const encryptedNewToken = encrypt(refreshedResult.access_token, config.encryptionKey);

  await prisma.instagramAccount.update({
    where: { id: accountId },
    data: {
      accessTokenEncrypted: encryptedNewToken.encrypted,
      accessTokenIV: encryptedNewToken.iv,
      accessTokenTag: encryptedNewToken.tag,
      tokenExpiresAt: newTokenExpiresAt,
      lastTokenRefresh: new Date(),
    },
  });

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.ACCOUNT_TOKEN_REFRESHED,
    'InstagramAccount',
    accountId,
    { igUsername: account.igUsername },
  );

  logger.info({ accountId, igUsername: account.igUsername, workspaceId }, 'Instagram account token refreshed');
}
