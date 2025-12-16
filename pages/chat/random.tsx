import { useState } from 'react';
import Header from '@/components/Header';

export default function RandomChatPage() {
  const [chatStatus, setChatStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [newMessage, setNewMessage] = useState('');

  // Mock data - will be replaced with real API data later
  const messages = [
    {
      id: 1,
      content: 'Hey! Nice to meet you',
      username: 'BravePegasus',
      is_me: false,
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 2,
      content: 'Hi there! How are you?',
      username: 'You',
      is_me: true,
      created_at: '2025-01-15T10:31:00Z',
    },
    {
      id: 3,
      content: 'Pretty good! What brings you here?',
      username: 'BravePegasus',
      is_me: false,
      created_at: '2025-01-15T10:32:00Z',
    },
  ];

  const handleFindChat = () => {
    // TODO: Call matchRandom API
    setChatStatus('waiting');
    // Simulate finding a match after 2 seconds
    setTimeout(() => setChatStatus('matched'), 2000);
  };

  const handleEndChat = () => {
    // TODO: Call end chat API
    setChatStatus('idle');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call createChatMessage API
    console.log('New message:', newMessage);
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="random-chat" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Random Chat</h1>

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
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8a4f32'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AA633F'}
              >
                Start Random Chat
              </button>
            </div>
          )}

          {/* Waiting State - Looking for match */}
          {chatStatus === 'waiting' && (
            <div className="p-12 text-center border border-black rounded-lg">
              <div className="text-6xl mb-6 animate-pulse">⏳</div>
              <h2 className="text-2xl font-semibold mb-4">Looking for a chat partner...</h2>
              <p className="text-gray-600">Please wait while we find someone for you</p>
            </div>
          )}

          {/* Matched State - Active chat */}
          {chatStatus === 'matched' && (
            <div className="border border-black rounded-lg">
              {/* Chat Header */}
              <div className="p-4 border-b border-black flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Chatting with: <span style={{ color: '#AA633F' }}>BravePegasus</span></h2>
                  <p className="text-sm text-gray-500">Random 1-on-1 Chat</p>
                </div>
                <button
                  onClick={handleEndChat}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-semibold"
                >
                  End Chat
                </button>
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
                    style={message.is_me ? { backgroundColor: '#f5e6dc' } : {}}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${message.is_me ? '' : 'text-gray-800'}`} style={message.is_me ? { color: '#AA633F' } : {}}>
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
                    style={{ backgroundColor: '#AA633F' }}
                    onMouseEnter={(e) => !newMessage.trim() ? null : e.currentTarget.style.backgroundColor = '#8a4f32'}
                    onMouseLeave={(e) => !newMessage.trim() ? null : e.currentTarget.style.backgroundColor = '#AA633F'}
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
