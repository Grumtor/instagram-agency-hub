import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useAccounts } from '../hooks/useAccounts';
import { useMessages } from '../hooks/useMessages';
import { ConversationList } from '../components/messages/ConversationList';
import { MessageThread } from '../components/messages/MessageThread';
import { MessageInput } from '../components/messages/MessageInput';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorAlert } from '../components/common/ErrorAlert';
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

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedConversation(null);
    if (accountId) {
      fetchConversations(accountId);
    }
  };

  const handleConversationSelect = (conv: Conversation) => {
    setSelectedConversation(conv);
    if (selectedAccountId) {
      fetchMessages(selectedAccountId, conv.id);
    }
  };

  const handleSend = async (message: string) => {
    if (!selectedAccountId || !selectedConversation) return;
    const recipientId = selectedConversation.participants[0]?.id;
    if (!recipientId) return;
    await sendMessage(selectedAccountId, recipientId, message);
    fetchMessages(selectedAccountId, selectedConversation.id);
  };

  return (
    <div className="space-y-6">
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
        <div className="flex h-[calc(100vh-280px)] overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="w-80 shrink-0 border-r border-gray-200 overflow-y-auto">
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Conversations</h3>
            </div>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id || null}
              onSelect={handleConversationSelect}
              loading={loading && !selectedConversation}
            />
          </div>

          <div className="flex flex-1 flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedConversation.participants
                      .map((p) => p.username)
                      .join(', ')}
                  </h3>
                </div>
                <MessageThread
                  messages={messages}
                  currentAccountId={selectedAccountId}
                  loading={loading}
                />
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
