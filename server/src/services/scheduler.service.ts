import cron from 'node-cron';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processPost } from '../workers/publishWorker';
import { refreshLongLivedToken } from '../utils/tokenRefresh';
import { decrypt, encrypt } from '../config/encryption';

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

      for (const post of posts) {
        try {
          await processPost(post.id);
        } catch (error) {
          logger.error(
            { error, postId: post.id },
            'Failed to process scheduled post',
          );
        }
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

  logger.info('Scheduler started');
}

export { startScheduler };
