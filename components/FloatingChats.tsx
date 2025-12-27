import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { clientApi } from '@/lib/api';
import { isSocketConnected } from '@/lib/socket';
import { getCurrentUser } from '@/lib/services/session';

interface Message {
  id: number;
  sender_username: string;
  content: string;
  created_at: string;
  sender_session_token: string;
}

export default function FloatingChats() {
  const { plannedChats, toggleMinimize, removePlannedChat, socket, showNotification, clearChatUnread, clearUnread } = useChatStore();
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [inputValues, setInputValues] = useState<Record<number, string>>({});
  const [currentUserSessionToken, setCurrentUserSessionToken] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null); // Track which dropdown is open
  const messagesEndRef = useRef<Record<number, HTMLDivElement | null>>({});
  const endedByMeRef = useRef<Set<number>>(new Set()); // Track sessions we ended

  // Get current user's session token
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await getCurrentUser();
        setCurrentUserSessionToken(response.user.session_token);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch message history
  const fetchMessages = async (sessionId: number) => {
    try {
      const response = await clientApi.get(`/api/chat/${sessionId}/messages`);
      setMessages((prev) => ({
        ...prev,
        [sessionId]: response.data.messages,
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send message
  const sendMessage = async (sessionId: number) => {
    const content = inputValues[sessionId]?.trim();
    if (!content) return;

    // Check socket connection
    if (!isSocketConnected()) {
      showNotification('error', 'Connection lost. Please refresh the page to reconnect.');
      return;
    }

    try {
      await clientApi.post(`/api/chat/${sessionId}/messages`, { content });
      setInputValues((prev) => ({ ...prev, [sessionId]: '' }));
    } catch (error: any) {
      console.error('Error sending message:', error);
      showNotification('error', error.response?.data?.error || 'Failed to send message');
    }
  };

  // End chat session
  const endChat = async (sessionId: number) => {
    if (!confirm('Are you sure you want to end this chat?')) return;

    // Check socket connection
    if (!isSocketConnected()) {
      showNotification('error', 'Connection lost. Please refresh the page to reconnect.');
      return;
    }

    try {
      // Mark that WE ended this session (don't show banner for our own action)
      endedByMeRef.current.add(sessionId);

      await clientApi.put(`/api/chat/${sessionId}/end`);
      removePlannedChat(sessionId);
    } catch (error: any) {
      console.error('Error ending chat:', error);
      showNotification('error', error.response?.data?.error || 'Failed to end chat');
      // Remove from set if request failed
      endedByMeRef.current.delete(sessionId);
    }
  };

  // Join Socket.io room and fetch messages when chat opens
  useEffect(() => {
    if (!socket) return;

    if (!isSocketConnected()) {
      console.error('Cannot join chat sessions: Socket not connected');
      return;
    }

    plannedChats.forEach((chat) => {
      try {
        // Join Socket.io room for this session
        socket.emit('join_session', { session_id: chat.id });

        // Fetch message history
        fetchMessages(chat.id);
      } catch (error) {
        console.error(`Error joining session ${chat.id}:`, error);
      }
    });

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      const sessionId = data.chat_session_id;
      setMessages((prev) => ({
        ...prev,
        [sessionId]: [
          ...(prev[sessionId] || []),
          {
            id: data.id,
            sender_username: data.sender_username,
            content: data.content,
            created_at: data.created_at,
            sender_session_token: data.sender_session_token,
          },
        ],
      }));
    };

    // Listen for session ended
    const handleSessionEnded = (data: { session_id: number; reason: string }) => {
      console.log('Session ended:', data);

      // Check if WE were the one who ended this chat
      const endedByMe = endedByMeRef.current.has(data.session_id);

      if (endedByMe) {
        // We ended it, so just clean up - no banner needed
        console.log('Session ended by me - no notification shown');
        endedByMeRef.current.delete(data.session_id);
      } else {
        // Partner ended it, show notification banner
        showNotification('error', `Chat Ended: ${data.reason}`, true, 8000);
      }

      // Remove chat from UI
      removePlannedChat(data.session_id);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('session_ended', handleSessionEnded);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('session_ended', handleSessionEnded);
      // Leave rooms when unmounting
      plannedChats.forEach((chat) => {
        socket.emit('leave_session', { session_id: chat.id });
      });
    };
  }, [socket, plannedChats.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    Object.keys(messages).forEach((sessionId) => {
      const ref = messagesEndRef.current[Number(sessionId)];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [messages]);

  // Clear unread count when floater is open and not minimized
  useEffect(() => {
    plannedChats.forEach((chat) => {
      if (!chat.isMinimized && chat.unreadCount > 0) {
        // Clear local unread counts
        clearChatUnread(chat.id);
        clearUnread(chat.id);
      }
    });
  }, [plannedChats.map(c => `${c.id}-${c.isMinimized}`).join(','), clearChatUnread, clearUnread]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  return (
    <>
      {/* Floating Chat Windows */}
      {plannedChats.length > 0 && (
        <div className="fixed bottom-4 right-4 flex items-end gap-3 z-40">
          {plannedChats.map((chat) => (
        <div
          key={chat.id}
          className="bg-white rounded-lg shadow-xl border-2"
          style={{
            borderColor: '#1e40af',
            width: chat.isMinimized ? '280px' : '320px',
            maxHeight: chat.isMinimized ? '50px' : '450px'
          }}
        >
          {/* Chat Header */}
          <div
            onClick={() => {
              if (chat.isMinimized) {
                toggleMinimize(chat.id);
              }
            }}
            className={`p-3 border-b border-gray-200 flex items-center justify-between ${chat.isMinimized ? 'cursor-pointer' : ''}`}
            style={{ backgroundColor: '#1e40af' }}
          >
            <div className="flex items-center gap-2 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!chat.isMinimized) {
                    setOpenDropdown(openDropdown === chat.id ? null : chat.id);
                  }
                }}
                className="flex items-center gap-1 text-white hover:text-gray-200"
              >
                <span className="font-semibold text-sm">
                  {chat.partnerUsername || chat.inviteCode}
                </span>
                {!chat.isMinimized && <span className="text-xs">▼</span>}
              </button>
              {chat.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {chat.unreadCount}
                </span>
              )}

              {/* Dropdown Menu */}
              {openDropdown === chat.id && (
                <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[140px] z-50">
                  {chat.status !== 'ended' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(null);
                        endChat(chat.id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-gray-50 transition"
                    >
                      End Chat
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(null);
                      // Report functionality to be implemented
                    }}
                    className="w-full text-left px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-gray-50 transition"
                  >
                    Report
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(null);
                  toggleMinimize(chat.id);
                }}
                className="text-white hover:text-gray-200 text-xl"
                title={chat.isMinimized ? "Expand" : "Minimize"}
              >
                {chat.isMinimized ? '+' : '−'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePlannedChat(chat.id);
                }}
                className="text-white hover:text-gray-200 text-2xl"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body - Only show when not minimized */}
          {!chat.isMinimized && (
            <div className="flex flex-col h-[400px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(messages[chat.id] || []).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_session_token !== currentUserSessionToken
                        ? 'justify-start'
                        : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        msg.sender_session_token !== currentUserSessionToken
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={(el) => (messagesEndRef.current[chat.id] = el)} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                {chat.status === 'ended' ? (
                  <div className="text-center text-gray-500 text-sm italic py-2">
                    This chat has ended. You can view the message history above.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage(chat.id);
                    }}
                    className="flex gap-3 items-center"
                  >
                    <input
                      type="text"
                      value={inputValues[chat.id] || ''}
                      onChange={(e) =>
                        setInputValues((prev) => ({
                          ...prev,
                          [chat.id]: e.target.value,
                        }))
                      }
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-gray-900 placeholder-gray-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm font-semibold"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
        </div>
      )}
    </>
  );
}
