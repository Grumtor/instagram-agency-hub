import axios from 'axios';
import { prisma } from '../config/database';
import { config } from '../config';
import { decrypt } from '../config/encryption';
import { NotFoundError } from '../utils/errors';
import { MessageDirection, AuditAction } from '../types/enums';
import { createAuditLog } from './auditLog.service';
import { logger } from '../utils/logger';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

async function getVerifiedAccount(igAccountId: string, workspaceId: string) {
  const account = await prisma.instagramAccount.findFirst({
    where: { id: igAccountId, workspaceId },
  });

  if (!account) {
    throw new NotFoundError('Instagram account');
  }

  const accessToken = decrypt(
    account.accessTokenEncrypted,
    account.accessTokenIV,
    account.accessTokenTag,
    config.encryptionKey,
  );

  return { account, accessToken };
}

export async function getConversations(workspaceId: string, igAccountId: string) {
  const { account, accessToken } = await getVerifiedAccount(igAccountId, workspaceId);

  logger.debug({ igAccountId, igUserId: account.igUserId }, 'Fetching conversations from Meta API');

  const response = await axios.get(`${GRAPH_API_BASE}/${account.igUserId}/conversations`, {
    params: {
      platform: 'instagram',
      fields: 'participants,messages{id,message,from,to,created_time}',
      access_token: accessToken,
    },
    timeout: 30_000,
  });

  return response.data.data ?? [];
}

export async function getMessages(workspaceId: string, igAccountId: string, conversationId: string) {
  const { accessToken } = await getVerifiedAccount(igAccountId, workspaceId);

  logger.debug({ igAccountId, conversationId }, 'Fetching messages from Meta API');

  const response = await axios.get(`${GRAPH_API_BASE}/${conversationId}`, {
    params: {
      fields: 'messages{id,message,from,to,created_time}',
      access_token: accessToken,
    },
    timeout: 30_000,
  });

  return response.data.messages?.data ?? [];
}

export async function sendMessage(
  workspaceId: string,
  igAccountId: string,
  recipientId: string,
  content: string,
  userId: string,
) {
  const { account, accessToken } = await getVerifiedAccount(igAccountId, workspaceId);

  logger.debug({ igAccountId, recipientId }, 'Sending message via Meta API');

  const response = await axios.post(
    `${GRAPH_API_BASE}/${account.igUserId}/messages`,
    {
      recipient: { id: recipientId },
      message: { text: content },
    },
    {
      params: { access_token: accessToken },
      timeout: 30_000,
    },
  );

  const messageId = response.data.message_id ?? response.data.id;

  await prisma.message.create({
    data: {
      workspaceId,
      igAccountId,
      conversationId: recipientId,
      senderId: account.igUserId,
      recipientId,
      content,
      direction: MessageDirection.OUTBOUND,
      sentAt: new Date(),
      igMessageId: messageId ?? null,
    },
  });

  await createAuditLog(
    workspaceId,
    userId,
    AuditAction.MESSAGE_SENT,
    'Message',
    messageId,
    { recipientId, igAccountId },
  );

  return { messageId };
}
