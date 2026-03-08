import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import type { MessageItem } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { MessageSquare } from 'lucide-react';

interface MessageThreadProps {
  messages: MessageItem[];
  currentAccountId: string;
  loading: boolean;
}

export function MessageThread({
  messages,
  currentAccountId,
  loading,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12">
        <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No messages in this conversation</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => {
        const isOwn = msg.from.id === currentAccountId;
        return (
          <div
            key={msg.id}
            className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5',
                isOwn
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              )}
            >
              <p className="text-sm">{msg.message}</p>
              <p
                className={cn(
                  'text-[10px] mt-1',
                  isOwn ? 'text-indigo-200' : 'text-gray-400'
                )}
              >
                {format(new Date(msg.created_time), 'MMM d, HH:mm')}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
