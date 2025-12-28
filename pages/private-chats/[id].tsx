import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import UserActionMenu from '@/components/UserActionMenu';
import { getAllChatSessions } from '@/lib/services/chat';
import { getCurrentUser } from '@/lib/services/session';
import { clientApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { isSocketConnected } from '@/lib/socket';

interface Message {
  id: number;
  sender_username: string;
  content: string;
  created_at: string;
  sender_session_token: string;
}

interface ChatSession {
  id: number;
  type: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  user1_username: string;
  user2_username: string;
  user1_session_token: string;
  user2_session_token: string;
}

export default function PrivateChatPage() {
  const router = useRouter();
  const { id } = router.query;
  const sessionId = parseInt(id as string);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const { socket, showNotification, plannedChats, removePlannedChat } = useChatStore();

  // Close floater if it exists for this session
  useEffect(() => {
    if (sessionId) {
      const floaterChat = plannedChats.find((chat) => chat.id === sessionId);
      if (floaterChat) {
        removePlannedChat(sessionId);
      }
    }
  }, [sessionId, plannedChats, removePlannedChat]);

  // Fetch session and user data
  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const userResponse = await getCurrentUser();
        setMySessionToken(userResponse.user.session_token);

        // Get all sessions and find this one
        const { sessions } = await getAllChatSessions();
        const currentSession = sessions.find((s: ChatSession) => s.id === sessionId);

        if (!currentSession) {
          showNotification('error', 'Chat session not found');
          router.push('/private-chats');
          return;
        }

        setSession(currentSession);

        // Fetch messages
        const messagesResponse = await clientApi.get(`/api/chat/${sessionId}/messages`);
        setMessages(messagesResponse.data.messages);

        // Mark session as read (clear notification)
        try {
          await clientApi.put(`/api/chat/${sessionId}/mark-read`);
        } catch (error) {
          console.error('Error marking session as read:', error);
        }
      } catch (error) {
        console.error('Error fetching chat:', error);
        showNotification('error', 'Failed to load chat');
        router.push('/private-chats');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Join Socket.io room and listen for new messages
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Join room
    socket.emit('join_session', { session_id: sessionId });

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.chat_session_id === sessionId) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender_username: data.sender_username,
            content: data.content,
            created_at: data.created_at,
            sender_session_token: data.sender_session_token,
          },
        ]);
      }
    };

    // Listen for session ended
    const handleSessionEnded = (data: { session_id: number; reason: string }) => {
      if (data.session_id === sessionId) {
        setSession((prev) => prev ? { ...prev, status: 'ended' } : null);
        showNotification('error', `Chat Ended: ${data.reason}`);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('session_ended', handleSessionEnded);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('session_ended', handleSessionEnded);
      socket.emit('leave_session', { session_id: sessionId });
    };
  }, [socket, sessionId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !sessionId || session?.status !== 'active') return;

    // Check socket connection
    if (!isSocketConnected()) {
      showNotification('error', 'Connection lost. Please refresh the page to reconnect.');
      return;
    }

    try {
      await clientApi.post(`/api/chat/${sessionId}/messages`, { content: newMessage.trim() });
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      showNotification('error', error.response?.data?.error || 'Failed to send message');
    }
  };

  const handleEndChat = async () => {
    if (!sessionId || !confirm('Are you sure you want to end this chat?')) return;

    try {
      await clientApi.put(`/api/chat/${sessionId}/end`);
      setSession((prev) => prev ? { ...prev, status: 'ended' } : null);
    } catch (error: any) {
      console.error('Error ending chat:', error);
      showNotification('error', error.response?.data?.error || 'Failed to end chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-marble-100">
        <Header currentPage="private-chats" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center py-12">Loading chat...</div>
        </main>
      </div>
    );
  }

  if (!session) {
    // This should not happen as we redirect in the useEffect
    return null;
  }

  const isUser1 = session.user1_session_token === mySessionToken;
  const partnerUsername = isUser1 ? session.user2_username : session.user1_username;
  const partnerSessionToken = isUser1 ? session.user2_session_token : session.user1_session_token;

  const getDisabledMessage = () => {
    if (session.status === 'ended') {
      return 'This chat has ended. You can view the message history above.';
    }
    if (session.status === 'waiting') {
      return 'This chat is still pending acceptance.';
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="private-chats" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border-4 border-aegean-600 overflow-hidden">
          {/* Chat Header */}
          <ChatHeader
            title={
              <UserActionMenu
                username={partnerUsername}
                userSessionToken={partnerSessionToken}
                currentUserSessionToken={mySessionToken}
                accentColor="#1e40af"
                className="text-xl font-semibold"
              />
            }
            subtitle={
              session.status === 'active' ? 'Active Chat' :
              session.status === 'ended' ? 'Chat Ended' :
              'Pending'
            }
            backUrl="/private-chats"
            accentColor="#1e40af"
            actions={
              session.status === 'active' && (
                <button
                  onClick={handleEndChat}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  End Chat
                </button>
              )
            }
          />

          {/* Messages */}
          <div className="border-t border-gray-200">
            <ChatMessageList
              messages={messages}
              currentUserSessionToken={mySessionToken}
              accentColor="#1e40af"
              autoScroll={autoScroll}
              emptyStateMessage="No messages yet. Start the conversation!"
            />
          </div>

          {/* Input */}
          <ChatInput
            value={newMessage}
            onChange={setNewMessage}
            onSubmit={handleSendMessage}
            disabled={session.status !== 'active'}
            disabledMessage={getDisabledMessage()}
            autoScroll={autoScroll}
            onAutoScrollChange={setAutoScroll}
            showAutoScroll={session.status === 'active'}
            accentColor="#1e40af"
          />
        </div>
      </main>
    </div>
  );
}
