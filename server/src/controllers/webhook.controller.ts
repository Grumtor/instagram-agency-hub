import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { prisma } from '../config/database';
import { MessageDirection } from '../types/enums';
import { logger } from '../utils/logger';
import type { MetaWebhookPayload } from '../types/meta.types';

function verifySignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  if (!signature) return false;

  const rawBody = req.rawBody;
  if (!rawBody) return false;

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', config.meta.appSecret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function verifyWebhook(req: Request, res: Response): Promise<void> {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, 'Webhook verification failed');
    res.sendStatus(403);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!verifySignature(req)) {
      logger.warn('Webhook signature verification failed');
      res.sendStatus(403);
      return;
    }

    const payload = req.body as MetaWebhookPayload;
    logger.debug({ object: payload.object, entryCount: payload.entry?.length }, 'Received webhook event');

    if (payload.object !== 'instagram' && payload.object !== 'page') {
      res.sendStatus(200);
      return;
    }

    for (const entry of payload.entry ?? []) {
      for (const messagingEvent of entry.messaging ?? []) {
        if (!messagingEvent.message?.text) continue;

        const senderId = messagingEvent.sender.id;
        const recipientId = messagingEvent.recipient.id;

        const igAccount = await prisma.instagramAccount.findFirst({
          where: { igUserId: recipientId },
        });

        if (!igAccount) {
          logger.warn({ recipientId }, 'Received message for unknown Instagram account');
          continue;
        }

        await prisma.message.upsert({
          where: { igMessageId: messagingEvent.message.mid },
          update: {},
          create: {
            workspaceId: igAccount.workspaceId,
            igAccountId: igAccount.id,
            conversationId: senderId,
            senderId,
            recipientId,
            content: messagingEvent.message.text,
            direction: MessageDirection.INBOUND,
            sentAt: new Date(messagingEvent.timestamp),
            igMessageId: messagingEvent.message.mid,
          },
        });

        logger.debug(
          { mid: messagingEvent.message.mid, igAccountId: igAccount.id },
          'Stored inbound message',
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error({ error }, 'Error processing webhook event');
    res.sendStatus(200);
  }
}
