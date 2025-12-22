import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { clientApi } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { endChatSession } from '@/lib/services/chat';
import { useChatStore } from '@/store/chatStore';
import { useSocketEvents } from '@/lib/hooks/useSocketEvents';
import UserActionMenu from '@/components/UserActionMenu';

export default function RandomChatPage() {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [userSessionToken, setUserSessionToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [chatEndedMessage, setChatEndedMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const cleanupCalled = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand store
  const {
    socket,
    initializeSocket,
    randomChatStatus,
    randomChatSessionId,
    randomChatPartner,
    randomChatMessages,
    setRandomChatStatus,
    setRandomChatSessionId,
    clearRandomChat,
    joinChatSession,
    leaveChatSession,
  } = useChatStore();

  // Get current user's username on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await clientApi.get('/api/session/me');
        if (response.data?.user?.username) {
          setCurrentUsername(response.data.user.username);
        }
        if (response.data?.user?.session_token) {
          setUserSessionToken(response.data.user.session_token);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  // Ensure socket is initialized (in case user navigated directly to URL)
  useEffect(() => {
    if (!socket) {
      console.log('🔌 Socket not initialized, initializing now...');
      initializeSocket();
    }
  }, [socket, initializeSocket]);

  // Initialize Socket.io event listeners
  useSocketEvents(currentUsername, setChatEndedMessage);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [randomChatMessages, autoScroll]);

  // Auto-cleanup session on unmount or navigation
  useEffect(() => {
    const cleanup = async () => {
      if (randomChatSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        console.log('🧹 Cleaning up chat session:', randomChatSessionId);
        try {
          await endChatSession(randomChatSessionId);
          clearRandomChat();
        } catch (err) {
          console.error('Error cleaning up session:', err);
        }
      }
    };

    // Cleanup on page navigation
    const handleRouteChange = () => {
      cleanup();
    };

    // Cleanup on page refresh or close (more reliable for browser events)
    const handleBeforeUnload = () => {
      if (randomChatSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        // Use fetch with keepalive - browser will complete request even after page closes
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://10.0.1.65:3000'}/api/chat/sessions/${randomChatSessionId}`, {
          method: 'DELETE',
          keepalive: true,  // Ensures request completes
          credentials: 'include',
        }).catch(err => console.error('Cleanup error:', err));
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [randomChatSessionId, router.events]);

  const handleFindChat = async () => {
    setError('');
    setChatEndedMessage(''); // Clear any previous ended message
    try {
      const response = await clientApi.post(API_ENDPOINTS.matchRandom());

      if (response.data.success) {
        const sessionId = response.data.chat_session_id;
        const status = response.data.status;

        setRandomChatSessionId(sessionId);
        setRandomChatStatus(status);
        cleanupCalled.current = false; // Reset cleanup flag for new session

        console.log('Chat session created:', response.data);

        // Join Socket.io room
        joinChatSession(sessionId);
      }
    } catch (err) {
      console.error('Error starting random chat:', err);
      setError('Failed to start chat. Please try again.');
      setRandomChatStatus('idle');
    }
  };

  const handleEndChat = async () => {
    if (!randomChatSessionId) return;

    try {
      // Leave Socket.io room
      leaveChatSession(randomChatSessionId);

      // End session via REST API
      await endChatSession(randomChatSessionId);

      // Reset state - go back to idle screen
      clearRandomChat();
      setChatEndedMessage(''); // Clear any messages
      setError(''); // Clear any errors
      cleanupCalled.current = true; // Mark as cleaned up
    } catch (err) {
      console.error('Error ending chat:', err);
      // Even if API fails, reset UI
      clearRandomChat();
      setChatEndedMessage('');
      cleanupCalled.current = true;
    }
  };

  const handleReroll = async () => {
    // End current session and start new one
    await handleEndChat();
    await handleFindChat();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !randomChatSessionId) return;

    try {
      // Send message via REST API
      // Backend will emit Socket.io event to both users
      await clientApi.post(API_ENDPOINTS.sendChatMessage(randomChatSessionId), {
        content: newMessage.trim()
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message.');
    }
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="random-chat" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Random Chat</h1>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Idle State - Not matched */}
          {randomChatStatus === 'idle' && (
            <div className="p-12 text-center border border-black rounded-lg">
              <div className="text-6xl mb-6">🦴</div>
              <h2 className="text-2xl text-gray-800 font-semibold mb-4">Cast the Astragaloi</h2>
              <p className="text-gray-600 mb-6">
                Roll the ancient knucklebones to find a random chat partner
              </p>
              <button
                onClick={handleFindChat}
                className="px-8 py-3 text-white rounded-lg transition font-semibold text-lg"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
              >
                Start Random Chat
              </button>
            </div>
          )}

          {/* Waiting State - Looking for match */}
          {randomChatStatus === 'waiting' && (
            <div className="p-12 text-center border border-black rounded-lg">
              <div className="text-6xl mb-6 animate-pulse">⏳</div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Looking for a chat partner...</h2>
              <p className="text-gray-600 mb-6">Please wait while we find someone for you</p>
              <button
                onClick={handleEndChat}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
              >
                Cancel Search
              </button>
            </div>
          )}

          {/* Matched/Ended State - Active or ended chat */}
          {(randomChatStatus === 'matched' || randomChatStatus === 'ended') && (
            <div className="border border-black rounded-lg">
              {/* Chat Header */}
              <div className="p-4 border-b border-black flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Chatting with: <UserActionMenu
                      username={randomChatPartner || 'Anonymous'}
                      accentColor="#4D89B0"
                      className="font-semibold"
                      style={{ color: '#4D89B0' }}
                    />
                  </h2>
                  <p className="text-sm text-gray-500">Random 1-on-1 Chat</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReroll}
                    className="px-4 py-2 text-white rounded-lg transition font-semibold"
                    style={{ backgroundColor: '#4D89B0' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
                  >
                    Reroll
                  </button>
                  <button
                    onClick={handleEndChat}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                  >
                    Leave Chat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {randomChatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.is_me ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-4 rounded-lg ${
                        message.is_me
                          ? 'border border-black'
                          : 'border border-black'
                      }`}
                      style={message.is_me ? { backgroundColor: '#e3f2fd' } : { backgroundColor: '#f5f5f5' }}
                    >
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-2">
                        <UserActionMenu
                          username={message.username}
                          userSessionToken={message.sender_session_token}
                          currentUserSessionToken={userSessionToken}
                          accentColor="#4D89B0"
                          className="font-semibold text-sm"
                          style={message.is_me ? { color: '#4D89B0' } : { color: '#6b7280' }}
                        />
                        <span className="text-xs text-gray-500 ml-3">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Message Content */}
                      <p className="text-gray-700">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Message Form */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-black">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span>Auto-scroll to new messages</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={randomChatStatus === 'ended' ? 'Chat has ended' : 'Type a message...'}
                    disabled={randomChatStatus === 'ended'}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || randomChatStatus === 'ended'}
                    className="px-6 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                    style={{ backgroundColor: randomChatStatus === 'ended' ? '#9ca3af' : '#4D89B0' }}
                    onMouseEnter={(e) => (!newMessage.trim() || randomChatStatus === 'ended') ? null : e.currentTarget.style.backgroundColor = '#3d6e8f'}
                    onMouseLeave={(e) => (!newMessage.trim() || randomChatStatus === 'ended') ? null : e.currentTarget.style.backgroundColor = '#4D89B0'}
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Chat Ended Banner */}
      {chatEndedMessage && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-500 text-white px-6 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <span className="font-semibold text-lg">Chat Ended: {chatEndedMessage}</span>
            </div>
            <button
              onClick={() => setChatEndedMessage('')}
              className="text-white hover:text-red-100 font-bold text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
