import { MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Conversation } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  if (loading) return <LoadingSpinner text="Loading conversations..." />;

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <MessageSquare className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No conversations</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const otherParticipants = conv.participants
          .map((p) => p.username)
          .join(', ');
        const lastMessage = conv.messages?.[0];

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={cn(
              'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
              selectedId === conv.id && 'bg-indigo-50 border-r-2 border-indigo-600'
            )}
          >
            <p className="text-sm font-medium text-gray-900 truncate">
              {otherParticipants || 'Unknown'}
            </p>
            {lastMessage && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {lastMessage.message}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
