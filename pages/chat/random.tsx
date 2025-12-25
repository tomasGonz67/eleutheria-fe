import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { clientApi } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { endChatSession, cancelChatSession } from '@/lib/services/chat';
import { useChatStore } from '@/store/chatStore';
import { useSocketEvents } from '@/lib/hooks/useSocketEvents';
import { isSocketConnected, connectSocket } from '@/lib/socket';
import UserActionMenu from '@/components/UserActionMenu';

export default function RandomChatPage() {
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [userSessionToken, setUserSessionToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
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

  // Keep refs to avoid stale closures in cleanup
  const statusRef = useRef(randomChatStatus);
  const sessionIdRef = useRef(randomChatSessionId);

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
  useSocketEvents(currentUsername);

  // Keep refs in sync with current values
  useEffect(() => {
    statusRef.current = randomChatStatus;
    sessionIdRef.current = randomChatSessionId;
  }, [randomChatStatus, randomChatSessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [randomChatMessages, autoScroll]);

  // Auto-cleanup session on unmount or navigation
  useEffect(() => {
    const cleanup = async () => {
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        console.log('🧹 Cleaning up chat session:', currentSessionId);
        try {
          // If waiting, cancel the search. If active/ended, end the session
          if (statusRef.current === 'waiting') {
            await cancelChatSession(currentSessionId);
          } else {
            await endChatSession(currentSessionId);
          }
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
      const currentSessionId = sessionIdRef.current;
      if (currentSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        // Use fetch with keepalive - browser will complete request even after page closes
        // If waiting, cancel the search. If active/ended, end the session
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://10.0.0.239:3000';
        const endpoint = statusRef.current === 'waiting'
          ? `/api/chat/${currentSessionId}/cancel`
          : `/api/chat/${currentSessionId}/end`;
        const method = statusRef.current === 'waiting' ? 'DELETE' : 'PUT';

        fetch(`${baseUrl}${endpoint}`, {
          method: method,
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
  }, [router.events]);

  const handleFindChat = async () => {
    setError('');

    // Check if socket is connected
    if (!isSocketConnected()) {
      console.log('Socket not connected, attempting to connect...');
      setIsConnecting(true);

      // Try to connect
      connectSocket();

      // Wait up to 3 seconds for connection
      const maxWaitTime = 3000;
      const checkInterval = 100;
      let elapsed = 0;

      while (elapsed < maxWaitTime && !isSocketConnected()) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsed += checkInterval;
      }

      setIsConnecting(false);

      // If still not connected after waiting, show error
      if (!isSocketConnected()) {
        setError('You are currently not connected. Please refresh the page and try again.');
        return;
      }
    }

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
      // If waiting, cancel the search. If active/ended, end the session
      if (randomChatStatus === 'waiting') {
        await cancelChatSession(randomChatSessionId);
      } else {
        await endChatSession(randomChatSessionId);
      }

      // Reset state - go back to idle screen
      clearRandomChat();
      setError(''); // Clear any errors
      cleanupCalled.current = true; // Mark as cleaned up
    } catch (err) {
      console.error('Error ending chat:', err);
      // Even if API fails, reset UI
      clearRandomChat();
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
                disabled={isConnecting}
                className="px-8 py-3 text-white rounded-lg transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: isConnecting ? '#6b7280' : '#4D89B0' }}
                onMouseEnter={(e) => !isConnecting && (e.currentTarget.style.backgroundColor = '#3d6e8f')}
                onMouseLeave={(e) => !isConnecting && (e.currentTarget.style.backgroundColor = '#4D89B0')}
              >
                {isConnecting ? 'Connecting...' : 'Start Random Chat'}
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
                  message.isSystem ? (
                    // System message (centered)
                    <div key={message.id} className="flex justify-center">
                      <div className="px-4 py-2 bg-gray-200 text-gray-600 rounded-full text-sm italic">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    // Regular user message
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
                  )
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
    </div>
  );
}
