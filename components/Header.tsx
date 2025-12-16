import Link from 'next/link';

interface HeaderProps {
  currentPage?: 'feed' | 'forums' | 'random-chat' | 'chatrooms';
}

export default function Header({ currentPage }: HeaderProps) {
  return (
    <header className="bg-marble-200 border-b-4 border-gold-600 shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-3xl font-bold text-aegean-700 hover:text-gold-600 transition-colors tracking-wide">
          ΕΛΕΥΘΕΡΙΑ
        </Link>
        <nav className="flex gap-4">
          <Link
            href="/feed"
            className={
              currentPage === 'feed'
                ? 'text-aegean-600 font-semibold'
                : 'text-gray-600 hover:text-aegean-600'
            }
          >
            Feed
          </Link>
          <Link
            href="/forums"
            className={
              currentPage === 'forums'
                ? 'text-aegean-600 font-semibold'
                : 'text-gray-600 hover:text-aegean-600'
            }
          >
            Forums
          </Link>
          <Link
            href="/chat/random"
            className={
              currentPage === 'random-chat'
                ? 'font-semibold'
                : 'text-gray-600'
            }
            style={currentPage === 'random-chat' ? { color: '#AA633F' } : {}}
            onMouseEnter={(e) => e.currentTarget.style.color = '#AA633F'}
            onMouseLeave={(e) => currentPage !== 'random-chat' ? e.currentTarget.style.color = '#6b7280' : null}
          >
            Random Chat
          </Link>
          <Link
            href="/chatrooms"
            className={
              currentPage === 'chatrooms'
                ? 'font-semibold'
                : 'text-gray-600'
            }
            style={currentPage === 'chatrooms' ? { color: '#AA633F' } : {}}
            onMouseEnter={(e) => e.currentTarget.style.color = '#AA633F'}
            onMouseLeave={(e) => currentPage !== 'chatrooms' ? e.currentTarget.style.color = '#6b7280' : null}
          >
            Chatrooms
          </Link>
        </nav>
      </div>
    </header>
  );
}
