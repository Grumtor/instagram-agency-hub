import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useAccounts } from '../hooks/useAccounts';
import { useMessages } from '../hooks/useMessages';
import { ConversationList } from '../components/messages/ConversationList';
import { MessageThread } from '../components/messages/MessageThread';
import { MessageInput } from '../components/messages/MessageInput';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { extractErrorMessage } from '../lib/errorUtils';
import type { Conversation } from '../types';

export default function MessagesPage() {
  const { accounts } = useAccounts();
  const {
    conversations,
    messages,
    loading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
  } = useMessages();

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  );
  const [sendError, setSendError] = useState<string | null>(null);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedConversation(null);
    if (accountId) {
      fetchConversations(accountId);
    }
  };

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    setSendError(null);
    if (selectedAccountId) {
      fetchMessages(selectedAccountId, conv.id);
    }
  };

  const handleRefreshConversations = useCallback(() => {
    if (selectedAccountId) {
      fetchConversations(selectedAccountId);
    }
  }, [selectedAccountId, fetchConversations]);

  const handleRefreshMessages = useCallback(() => {
    if (selectedAccountId && selectedConversation) {
      fetchMessages(selectedAccountId, selectedConversation.id);
    }
  }, [selectedAccountId, selectedConversation, fetchMessages]);

  const handleSend = async (message: string) => {
    if (!selectedAccountId || !selectedConversation) return;
    const recipientId = selectedConversation.participants[0]?.id;
    if (!recipientId) return;
    try {
      await sendMessage(selectedAccountId, recipientId, message);
      setSendError(null);
      fetchMessages(selectedAccountId, selectedConversation.id);
    } catch (err) {
      setSendError(extractErrorMessage(err, 'Failed to send message'));
    }
  };

  // 30s polling when a conversation is selected
  useEffect(() => {
    if (!selectedConversation || !selectedAccountId) return;

    const interval = setInterval(() => {
      fetchMessages(selectedAccountId, selectedConversation.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedConversation, selectedAccountId, fetchMessages]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and respond to Instagram direct messages
        </p>
      </div>

      <div className="mb-4">
        <select
          value={selectedAccountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select an account...</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              @{acc.igUsername}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorAlert message={error} />}

      {!selectedAccountId ? (
        <EmptyState
          icon={MessageSquare}
          title="Select an account"
          description="Choose an Instagram account to view its conversations."
        />
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Conversations</h3>
              <button
                onClick={handleRefreshConversations}
                className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Refresh conversations"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversation?.id || null}
                onSelect={handleConversationSelect}
                loading={loading && !selectedConversation}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col min-h-0">
            {selectedConversation ? (
              <>
                <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedConversation.participants
                      .map((p) => p.username)
                      .join(', ')}
                  </h3>
                  <button
                    onClick={handleRefreshMessages}
                    className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Refresh messages"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MessageThread
                    messages={messages}
                    currentAccountId={selectedAccountId}
                    loading={loading}
                  />
                </div>
                {sendError && (
                  <div className="px-4 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">
                    {sendError}
                  </div>
                )}
                <MessageInput onSend={handleSend} />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-gray-400">
                  Select a conversation to view messages
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
