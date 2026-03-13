import cron from 'node-cron';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processPost } from '../workers/publishWorker';
import { refreshLongLivedToken } from '../utils/tokenRefresh';
import { decrypt, encrypt } from '../config/encryption';
import { createNotificationForWorkspace } from './notification.service';

function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const posts = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (posts.length > 0) {
        logger.info({ count: posts.length }, 'Processing scheduled posts');
      }

      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < posts.length; i += CONCURRENCY_LIMIT) {
        const batch = posts.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.allSettled(
          batch.map((post) => processPost(post.id))
        );
        for (const result of results) {
          if (result.status === 'rejected') {
            logger.error({ error: result.reason }, 'Failed to process scheduled post in batch');
          }
        }
      }
      if (posts.length > CONCURRENCY_LIMIT) {
        logger.info({ total: posts.length, concurrency: CONCURRENCY_LIMIT }, 'Processed posts in batches');
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler: error querying scheduled posts');
    }
  });

  cron.schedule('0 3 * * *', async () => {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const accounts = await prisma.instagramAccount.findMany({
        where: {
          isActive: true,
          tokenExpiresAt: { lte: sevenDaysFromNow },
        },
      });

      if (accounts.length > 0) {
        logger.info(
          { count: accounts.length },
          'Refreshing tokens for accounts expiring soon',
        );
      }

      for (const account of accounts) {
        // Notify workspace members about accounts that are expiring soon (not yet expired)
        const now = new Date();
        if (account.tokenExpiresAt && account.tokenExpiresAt > now) {
          const daysUntilExpiry = Math.ceil(
            (account.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          createNotificationForWorkspace({
            workspaceId: account.workspaceId,
            type: 'token_expiring',
            title: 'Instagram token expiring soon',
            message: `The access token for @${account.igUsername} is expiring in ${daysUntilExpiry} day(s). It will be refreshed automatically.`,
            link: `/accounts`,
            metadata: { accountId: account.id, igUsername: account.igUsername, daysUntilExpiry },
          }).catch((err) =>
            logger.error({ err, accountId: account.id }, 'Failed to create token_expiring notification'),
          );
        }

        try {
          const currentToken = decrypt(
            account.accessTokenEncrypted,
            account.accessTokenIV,
            account.accessTokenTag,
            config.encryptionKey,
          );

          const tokenData = await refreshLongLivedToken(currentToken);
          const encrypted = encrypt(tokenData.access_token, config.encryptionKey);

          const expiresAt = tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null;

          await prisma.instagramAccount.update({
            where: { id: account.id },
            data: {
              accessTokenEncrypted: encrypted.encrypted,
              accessTokenIV: encrypted.iv,
              accessTokenTag: encrypted.tag,
              tokenExpiresAt: expiresAt,
              lastTokenRefresh: new Date(),
            },
          });

          logger.info(
            { accountId: account.id, igUsername: account.igUsername },
            'Token refreshed successfully',
          );
        } catch (error) {
          logger.error(
            { error, accountId: account.id, igUsername: account.igUsername },
            'Failed to refresh token',
          );
        }
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler: error in token refresh job');
    }
  });

  // Daily cleanup: expired refresh tokens and consumed OAuth states
  cron.schedule('0 4 * * *', async () => {
    try {
      const now = new Date();
      const deletedTokens = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      const deletedStates = await prisma.consumedOAuthState.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (deletedTokens.count > 0 || deletedStates.count > 0) {
        logger.info(
          { deletedTokens: deletedTokens.count, deletedStates: deletedStates.count },
          'Cleaned up expired tokens and OAuth states',
        );
      }
    } catch (error) {
      logger.error({ error }, 'Scheduler: error in cleanup job');
    }
  });

  logger.info('Scheduler started');
}

export { startScheduler };
