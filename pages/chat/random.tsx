import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { clientApi } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { endChatSession } from '@/lib/services/chat';

interface Message {
  id: number;
  content: string;
  username: string;
  is_me: boolean;
  created_at: string;
}

export default function RandomChatPage() {
  const router = useRouter();
  const [chatStatus, setChatStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [partnerUsername, setPartnerUsername] = useState('');
  const [error, setError] = useState('');
  const cleanupCalled = useRef(false);

  // Auto-cleanup session on unmount or navigation
  useEffect(() => {
    const cleanup = async () => {
      if (chatSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        console.log('🧹 Cleaning up chat session:', chatSessionId);
        try {
          await endChatSession(chatSessionId);
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
      if (chatSessionId && !cleanupCalled.current) {
        cleanupCalled.current = true;
        // Use fetch with keepalive - browser will complete request even after page closes
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/chat/sessions/${chatSessionId}`, {
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
  }, [chatSessionId, router.events]);

  const handleFindChat = async () => {
    setError('');
    try {
      const response = await clientApi.post(API_ENDPOINTS.matchRandom());
      
      if (response.data.success) {
        setChatSessionId(response.data.chat_session_id);
        setChatStatus(response.data.status);
        cleanupCalled.current = false; // Reset cleanup flag for new session
        
        console.log('Chat session created:', response.data);
        // TODO: Join Socket.io room and poll for match
      }
    } catch (err) {
      console.error('Error starting random chat:', err);
      setError('Failed to start chat. Please try again.');
      setChatStatus('idle');
    }
  };

  const handleEndChat = async () => {
    if (!chatSessionId) return;
    
    try {
      await endChatSession(chatSessionId);
      setChatSessionId(null);
      setChatStatus('idle');
      setMessages([]);
      setPartnerUsername('');
      cleanupCalled.current = true; // Mark as cleaned up
    } catch (err) {
      console.error('Error ending chat:', err);
      setError('Failed to end chat.');
    }
  };

  const handleReroll = async () => {
    // End current session and start new one
    await handleEndChat();
    await handleFindChat();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !chatSessionId) return;

    try {
      await clientApi.post(API_ENDPOINTS.sendChatMessage(chatSessionId), {
        content: newMessage.trim()
      });
      
      setNewMessage('');
      // TODO: Message will appear via Socket.io or polling
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
          {chatStatus === 'idle' && (
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
          {chatStatus === 'waiting' && (
            <div className="p-12 text-center border border-black rounded-lg">
              <div className="text-6xl mb-6 animate-pulse">⏳</div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Looking for a chat partner...</h2>
              <p className="text-gray-600">Please wait while we find someone for you</p>
            </div>
          )}

          {/* Matched State - Active chat */}
          {chatStatus === 'matched' && (
            <div className="border border-black rounded-lg">
              {/* Chat Header */}
              <div className="p-4 border-b border-black flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Chatting with: <span style={{ color: '#4D89B0' }}>{partnerUsername || 'Anonymous'}</span></h2>
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
                    End Chat
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.is_me
                        ? 'ml-12 border border-black'
                        : 'border border-black mr-12'
                    }`}
                    style={message.is_me ? { backgroundColor: '#e3f2fd' } : {}}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${message.is_me ? '' : 'text-gray-800'}`} style={message.is_me ? { color: '#4D89B0' } : {}}>
                        {message.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message Content */}
                    <p className="text-gray-700">{message.content}</p>
                  </div>
                ))}
              </div>

              {/* Send Message Form */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-black">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-6 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#4D89B0' }}
                    onMouseEnter={(e) => !newMessage.trim() ? null : e.currentTarget.style.backgroundColor = '#3d6e8f'}
                    onMouseLeave={(e) => !newMessage.trim() ? null : e.currentTarget.style.backgroundColor = '#4D89B0'}
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
