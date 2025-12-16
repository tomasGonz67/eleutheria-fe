import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [username, setUsername] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Eleutheria</h1>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">Welcome to Eleutheria</h2>
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Leave blank for a random Greek-themed username
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Forums Section */}
          <div className="bg-white p-8 rounded-lg border-2 border-gray-200">
            <div className="text-4xl mb-4">📜</div>
            <h3 className="text-3xl font-bold mb-4">Forums</h3>
            <p className="text-gray-600 mb-6">
              Browse public forums and join discussions. Create posts and engage with the community.
            </p>
            <div className="space-y-3">
              <Link
                href="/feed"
                className="block w-full py-3 px-4 bg-blue-500 text-white text-center rounded-lg hover:bg-blue-600 transition font-semibold"
              >
                View Global Feed
              </Link>
              <Link
                href="/forums"
                className="block w-full py-3 px-4 border-2 border-blue-500 text-blue-500 text-center rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                Browse Forums
              </Link>
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-white p-8 rounded-lg border-2 border-gray-200">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-3xl font-bold mb-4">Chat</h3>
            <p className="text-gray-600 mb-6">
              Connect with others through random 1-on-1 chats or join public chatrooms for group conversations.
            </p>
            <div className="space-y-3">
              <Link
                href="/chat/random"
                className="block w-full py-3 px-4 bg-green-500 text-white text-center rounded-lg hover:bg-green-600 transition font-semibold"
              >
                Random Chat
              </Link>
              <Link
                href="/chatrooms"
                className="block w-full py-3 px-4 border-2 border-green-500 text-green-500 text-center rounded-lg hover:bg-green-50 transition font-semibold"
              >
                Browse Chatrooms
              </Link>
            </div>
          </div>
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
