import { useRef, useEffect } from 'react';
import UserActionMenu from '@/components/UserActionMenu';

interface Message {
  id: number;
  content: string;
  username: string;
  sender_session_token: string;
  created_at: string;
}

interface ChatMessageListProps {
  messages: Message[];
  currentUserSessionToken: string | null;
  accentColor?: string;
  autoScroll?: boolean;
  emptyStateMessage?: string;
}

export default function ChatMessageList({
  messages,
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

  return (
    <div className="p-6 space-y-4 min-h-[500px] max-h-[600px] overflow-y-auto">
      {messages.map((message) => {
        const isOwnMessage = message.sender_session_token === currentUserSessionToken;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-lg ${
                isOwnMessage ? 'bg-gray-300' : 'bg-gray-100'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2 gap-3">
                <UserActionMenu
                  username={message.username}
                  userSessionToken={message.sender_session_token}
                  currentUserSessionToken={currentUserSessionToken}
                  accentColor={accentColor}
                  className="font-semibold text-gray-800 text-sm"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Message Content */}
              <p className="text-gray-700 break-words">{message.content}</p>
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
