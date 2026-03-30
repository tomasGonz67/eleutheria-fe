import { useRef, useEffect } from 'react';
import UserActionMenu from '@/components/UserActionMenu';
import { Message } from '@/lib/types';

interface ChatMessageListProps {
  messages: Message[];
  currentUserDiscriminator: string | null;
  currentUserSessionToken?: string | null;
  accentColor?: string;
  autoScroll?: boolean;
  emptyStateMessage?: string;
}

export default function ChatMessageList({
  messages,
  currentUserDiscriminator,
  currentUserSessionToken,
  accentColor = '#4D89B0',
  autoScroll = true,
  emptyStateMessage = 'No messages yet. Start the conversation!',
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Track which date string was last shown to insert dividers
  let lastDateLabel = '';

  return (
    <div className="p-6 space-y-4 min-h-[500px] max-h-[600px] overflow-y-auto">
      {messages.map((message) => {
        const isOwnMessage = message.sender_discriminator === currentUserDiscriminator;

        // Date divider logic
        const messageDate = new Date(message.created_at);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let dateLabel: string;
        if (messageDate.toDateString() === today.toDateString()) {
          dateLabel = 'Today';
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
          dateLabel = 'Yesterday';
        } else {
          dateLabel = messageDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

        const showDateDivider = dateLabel !== lastDateLabel;
        if (showDateDivider) lastDateLabel = dateLabel;

        return (
          <div key={message.id}>
            {showDateDivider && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-gray-300" />
                <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">{dateLabel}</span>
                <div className="flex-1 border-t border-gray-300" />
              </div>
            )}
            <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] p-4 rounded-lg ${
                isOwnMessage ? 'bg-gray-300' : 'bg-gray-100'
              }`}
            >
              {/* Message Header */}
              <div className="mb-2">
                <UserActionMenu
                  username={message.username}
                  discriminator={message.sender_discriminator}
                  hideDiscriminator={message.sender_hide_discriminator}
                  isOwnPost={message.is_me}
                  accentColor={accentColor}
                  className="font-semibold text-gray-800 text-sm"
                />
              </div>

              {/* Message Content */}
              <p className="text-gray-700 break-words whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {message.content.replace(/\n{3,}/g, '\n\n').trim()}
              </p>

              {/* Timestamp */}
              <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {messages.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyStateMessage}</p>
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
