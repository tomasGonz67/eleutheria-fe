import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createSession } from '@/lib/services/session';
import { useChatStore } from '@/store/chatStore';
import { clientApi } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const { initializeSocket } = useChatStore();
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('eleutheria_username');
    if (saved) setUsername(saved);
  }, []);

  const handleNavigate = async (path: string) => {
    setIsCreatingSession(true);
    try {
      // Create session with username (or empty for random username)
      await createSession(username.trim() || undefined);
      if (username.trim()) {
        localStorage.setItem('eleutheria_username', username.trim());
      } else {
        localStorage.removeItem('eleutheria_username');
      }
      
      // Initialize Socket.io connection once session is created
      initializeSocket();
      console.log('🔌 Socket initialized after session creation');
      
      // Navigate after session is created
      router.push(path);
    } catch (error) {
      console.error('Error creating session:', error);
      // Navigate anyway (session might already exist)
      router.push(path);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-marble-100">
      <Head>
        <title>Eleutheria - Anonymous Community Platform | Forums & Chat</title>
        <meta name="description" content="Eleutheria is an anonymous, session-based community platform. Speak freely in forums, chatrooms, and random chats. No sign-up required." />
        <meta property="og:title" content="Eleutheria - Anonymous Community Platform" />
        <meta property="og:description" content="Speak freely in forums, chatrooms, and random chats. No sign-up required." />
        <meta property="og:type" content="website" />
      </Head>
      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-6 py-6 w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-7xl font-bold mb-2 text-aegean-800 tracking-widest">ELEUTHERIA</h1>
          <p className="text-3xl md:text-6xl font-bold text-aegean-600 tracking-[0.15em] md:tracking-[0.3em] mb-4 animate-fade-in-greek" style={{ fontStyle: 'italic' }}>ΕΛΕΥΘΕΡΙΑ</p>
          <div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
              Anonymous, session-based community platform. Speak freely in forums, chatrooms, and random chats.
            </p>

            {/* Username Input */}
            <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter username (optional)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isCreatingSession && handleNavigate('/feed')}
                maxLength={20}
                className="flex-1 px-4 py-3 border-2 border-black text-black rounded-lg focus:outline-none"
                style={{ }}
                onFocus={(e) => e.target.style.borderColor = '#4D89B0'}
                onBlur={(e) => e.target.style.borderColor = 'black'}
              />
              <button
                onClick={() => handleNavigate('/feed')}
                disabled={isCreatingSession}
                className="px-6 py-3 text-white rounded-lg transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#3d6e8f')}
                onMouseLeave={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#4D89B0')}
              >
                {isCreatingSession ? '...' : 'Enter'}
              </button>
            </div>
              <p className="text-sm text-gray-500 mt-2">
                Leave blank for a random Greek-themed username
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Forums Section */}
          <div className="bg-marble-200 p-6 rounded-lg border-4 shadow-lg" style={{ borderColor: '#4D89B0' }}>
            <h3 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: '#4D89B0' }}>
              <span className="text-4xl">📜</span>
              Forums
            </h3>
            <p className="text-gray-600 mb-4">
              Browse public forums and join discussions. Create posts and engage with the community.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleNavigate('/feed')}
                disabled={isCreatingSession}
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#3d6e8f')}
                onMouseLeave={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#4D89B0')}
              >
                {isCreatingSession ? 'Loading...' : 'View Global Feed'}
              </button>
              <button
                onClick={() => handleNavigate('/forums')}
                disabled={isCreatingSession}
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#3d6e8f')}
                onMouseLeave={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#4D89B0')}
              >
                {isCreatingSession ? 'Loading...' : 'Browse Forums'}
              </button>
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-marble-200 p-6 rounded-lg border-4 shadow-lg" style={{ borderColor: '#AA633F' }}>
            <h3 className="text-3xl font-bold mb-2 flex items-center gap-3" style={{ color: '#AA633F' }}>
              <span className="text-4xl">💬</span>
              Chat
            </h3>
            <p className="text-gray-600 mb-4">
              Connect with others through random 1-on-1 chats or join public chatrooms for group conversations.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleNavigate('/chat/random')}
                disabled={isCreatingSession}
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#8a4f32')}
                onMouseLeave={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#AA633F')}
              >
                {isCreatingSession ? 'Loading...' : 'Random Chat'}
              </button>
              <button
                onClick={() => handleNavigate('/chatrooms')}
                disabled={isCreatingSession}
                className="block w-full py-3 px-4 text-white text-center rounded-lg transition font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#8a4f32')}
                onMouseLeave={(e) => !isCreatingSession && (e.currentTarget.style.backgroundColor = '#AA633F')}
              >
                {isCreatingSession ? 'Loading...' : 'Browse Chatrooms'}
              </button>
            </div>
          </div>
        </div>

        {/* Contact Button */}
        <div className="mt-6 text-center flex justify-center gap-4">
          <button
            onClick={() => setIsContactOpen(true)}
            className="px-8 py-3 border-2 border-gray-400 text-gray-600 rounded-lg transition font-semibold hover:border-gray-600 hover:text-gray-800"
          >
            Contact Us
          </button>
        </div>

        {/* Info Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-500">
            All interactions are anonymous. No sign-up required. Your session is tracked by cookies for moderation purposes only.
          </p>
        </div>
      </main>

      {/* Contact Modal */}
      {isContactOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setIsContactOpen(false); }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#4D89B0' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Contact Us</h2>
              <button onClick={() => setIsContactOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Your email"
                  className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="What would you like to tell us?"
                  className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <button
                disabled={!contactMessage.trim() || contactStatus === 'sending' || contactStatus === 'sent'}
                className="w-full py-3 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{ backgroundColor: !contactMessage.trim() ? '#9ca3af' : '#4D89B0' }}
                onMouseEnter={(e) => contactMessage.trim() && (e.currentTarget.style.backgroundColor = '#3d6e8f')}
                onMouseLeave={(e) => contactMessage.trim() && (e.currentTarget.style.backgroundColor = '#4D89B0')}
                onClick={async () => {
                  setContactStatus('sending');
                  try {
                    await clientApi.post('/api/contact', {
                      name: contactName.trim() || undefined,
                      email: contactEmail.trim() || undefined,
                      message: contactMessage.trim(),
                    });
                    setContactStatus('sent');
                    setContactName('');
                    setContactEmail('');
                    setContactMessage('');
                    setTimeout(() => {
                      setIsContactOpen(false);
                      setContactStatus('idle');
                    }, 1500);
                  } catch {
                    setContactStatus('error');
                    setTimeout(() => setContactStatus('idle'), 3000);
                  }
                }}
              >
                {contactStatus === 'sending' ? 'Sending...' : contactStatus === 'sent' ? 'Sent!' : contactStatus === 'error' ? 'Failed — try again' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
