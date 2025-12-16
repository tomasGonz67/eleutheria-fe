import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Header from '@/components/Header';

export default function ChatroomMessagesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [newMessage, setNewMessage] = useState('');

  // Mock data - will be replaced with real API data later
  const chatroom = {
    id: 1,
    name: 'General Chat',
    description: 'General discussion and casual conversation',
  };

  const messages = [
    {
      id: 1,
      content: 'Hey everyone! What\'s up?',
      username: 'WiseAthena',
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 2,
      content: 'Not much, just enjoying the chat!',
      username: 'BravePegasus',
      created_at: '2025-01-15T10:31:00Z',
    },
    {
      id: 3,
      content: 'This is a cool chatroom. Anyone here into philosophy?',
      username: 'SwiftHermes',
      created_at: '2025-01-15T10:35:00Z',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call createChatroomMessage API
    console.log('New message:', newMessage);
    setNewMessage('');
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="chatrooms" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
          <a href="/chatrooms" className="text-sm mb-4 inline-block hover:underline" style={{ color: '#AA633F' }}>
            ← Back to Chatrooms
          </a>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">{chatroom.name}</h1>
          <p className="text-gray-600 mb-6">{chatroom.description}</p>

          <div className="border border-black rounded-lg">
            {/* Messages */}
            <div className="p-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-4 rounded-lg border border-black">
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">{message.username}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Message Content */}
                  <p className="text-gray-700">{message.content}</p>
                </div>
              ))}

              {/* Empty State */}
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              )}
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
        </div>
      </main>
    </div>
  );
}
