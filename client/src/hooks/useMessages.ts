import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Conversation, MessageItem } from '../types';
import { useWorkspace } from './useWorkspace';
import { extractErrorMessage } from '../lib/errorUtils';

export function useMessages() {
  const { currentWorkspace } = useWorkspace();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(
    async (accountId: string) => {
      if (!currentWorkspace || !accountId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(
          `/api/workspaces/${currentWorkspace.id}/messages/conversations`,
          { params: { igAccountId: accountId } }
        );
        setConversations(Array.isArray(data) ? data : data.conversations ?? data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load conversations'));
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace]
  );

  const fetchMessages = useCallback(
    async (accountId: string, conversationId: string) => {
      if (!currentWorkspace || !accountId || !conversationId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(
          `/api/workspaces/${currentWorkspace.id}/messages/conversations/${conversationId}`,
          { params: { igAccountId: accountId } }
        );
        setMessages(Array.isArray(data) ? data : data.messages ?? data);
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load messages'));
      } finally {
        setLoading(false);
      }
    },
    [currentWorkspace]
  );

  const sendMessage = useCallback(
    async (accountId: string, recipientId: string, content: string) => {
      if (!currentWorkspace) return;
      await api.post(
        `/api/workspaces/${currentWorkspace.id}/messages/send`,
        { igAccountId: accountId, recipientId, content }
      );
    },
    [currentWorkspace]
  );

  return {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
  };
}
