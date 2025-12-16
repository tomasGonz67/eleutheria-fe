import Link from 'next/link';
import Header from '@/components/Header';

export default function ChatroomsPage() {
  // Mock data - will be replaced with real API data later
  const chatrooms = [
    {
      id: 1,
      name: 'General Chat',
      description: 'General discussion and casual conversation',
      created_at: '2025-01-10T12:00:00Z',
    },
    {
      id: 2,
      name: 'Tech Talk',
      description: 'Discuss technology, programming, and innovation',
      created_at: '2025-01-11T15:30:00Z',
    },
    {
      id: 3,
      name: 'Philosophy Corner',
      description: 'Deep philosophical discussions',
      created_at: '2025-01-12T09:00:00Z',
    },
    {
      id: 4,
      name: 'Gaming Lounge',
      description: 'Talk about your favorite games',
      created_at: '2025-01-13T18:45:00Z',
    },
  ];

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="chatrooms" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Chatrooms</h1>
            <button
              className="px-4 py-2 text-white rounded-lg transition font-semibold"
              style={{ backgroundColor: '#AA633F' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8a4f32'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AA633F'}
            >
              Create Chatroom
            </button>
          </div>

          {/* Chatrooms List */}
          <div className="space-y-4">
            {chatrooms.map((chatroom) => (
              <Link
                key={chatroom.id}
                href={`/chatrooms/${chatroom.id}`}
                className="block bg-white p-6 rounded-lg border-2 hover:shadow-lg transition"
                style={{ borderColor: '#AA633F' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{chatroom.name}</h2>
                    <p className="text-gray-600">{chatroom.description}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                    {new Date(chatroom.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {chatrooms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No chatrooms yet. Create the first one!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
