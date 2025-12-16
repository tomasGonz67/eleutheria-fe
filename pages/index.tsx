import Link from 'next/link';
import { useState } from 'react';
import PlannedChat from '@/components/PlannedChat';

export default function Home() {
  const [username, setUsername] = useState('');

  return (
    <div className="min-h-screen bg-marble-100">
      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12 mt-28">
          <h2 className="text-7xl font-bold mb-4 text-aegean-800 tracking-widest animate-fade-in">ΕΛΕΥΘΕΡΙΑ</h2>
          <div className="animate-fade-in-delay-1">
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Anonymous, session-based community platform. Speak freely in forums, chatrooms, and random chats.
            </p>

            {/* Username Input */}
            <div className="max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 border-2 border-black text-black rounded-lg focus:outline-none"
              style={{ }}
              onFocus={(e) => e.target.style.borderColor = '#4D89B0'}
              onBlur={(e) => e.target.style.borderColor = 'black'}
            />
              <p className="text-sm text-gray-500 mt-2">
                Leave blank for a random Greek-themed username
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 animate-fade-in-delay-2">
          {/* Forums Section */}
          <div className="bg-marble-200 p-8 rounded-lg border-4 shadow-lg" style={{ borderColor: '#4D89B0' }}>
            <h3 className="text-3xl font-bold mb-4 flex items-center gap-3" style={{ color: '#4D89B0' }}>
              <span className="text-4xl">📜</span>
              Forums
            </h3>
            <p className="text-gray-600 mb-6">
              Browse public forums and join discussions. Create posts and engage with the community.
            </p>
            <div className="space-y-3">
              <Link
                href="/feed"
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
              >
                View Global Feed
              </Link>
              <Link
                href="/forums"
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
              >
                Browse Forums
              </Link>
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-marble-200 p-8 rounded-lg border-4 shadow-lg" style={{ borderColor: '#AA633F' }}>
            <h3 className="text-3xl font-bold mb-4 flex items-center gap-3" style={{ color: '#AA633F' }}>
              <span className="text-4xl">💬</span>
              Chat
            </h3>
            <p className="text-gray-600 mb-6">
              Connect with others through random 1-on-1 chats or join public chatrooms for group conversations.
            </p>
            <div className="space-y-3">
              <Link
                href="/chat/random"
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md"
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8a4f32'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AA633F'}
              >
                Random Chat
              </Link>
              <Link
                href="/chatrooms"
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md"
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8a4f32'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AA633F'}
              >
                Browse Chatrooms
              </Link>
            </div>
          </div>
        </div>

        {/* Planned Chat Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <PlannedChat />
        </div>

        {/* Info Section */}
        <div className="mt-16 text-center">
          <p className="text-gray-500">
            All interactions are anonymous. No sign-up required. Your session is tracked by cookies for moderation purposes only.
          </p>
        </div>
      </main>
    </div>
  );
}
