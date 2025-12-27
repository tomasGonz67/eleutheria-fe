import Link from 'next/link';
import { useChatStore } from '@/store/chatStore';

interface HeaderProps {
  currentPage?: 'feed' | 'forums' | 'random-chat' | 'chatrooms' | 'private-chats';
}

export default function Header({ currentPage }: HeaderProps) {
  const { messageRequests, plannedChats, chatUnreadCounts } = useChatStore();

  // Calculate total notifications: pending requests + unread messages (from floaters and global)
  const floaterUnreads = plannedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  const globalUnreads = Object.values(chatUnreadCounts).reduce((sum, count) => sum + count, 0);
  const totalNotifications = messageRequests.length + floaterUnreads + globalUnreads;

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
                ? 'font-semibold'
                : 'text-gray-600'
            }
            style={currentPage === 'feed' ? { color: '#AA633F' } : {}}
            onMouseEnter={(e) => e.currentTarget.style.color = '#AA633F'}
            onMouseLeave={(e) => currentPage !== 'feed' ? e.currentTarget.style.color = '#6b7280' : null}
          >
            Feed
          </Link>
          <Link
            href="/forums"
            className={
              currentPage === 'forums'
                ? 'font-semibold'
                : 'text-gray-600'
            }
            style={currentPage === 'forums' ? { color: '#AA633F' } : {}}
            onMouseEnter={(e) => e.currentTarget.style.color = '#AA633F'}
            onMouseLeave={(e) => currentPage !== 'forums' ? e.currentTarget.style.color = '#6b7280' : null}
          >
            Forums
          </Link>
          <Link
            href="/chat/random"
            className={
              currentPage === 'random-chat'
                ? 'text-aegean-600 font-semibold'
                : 'text-gray-600 hover:text-aegean-600'
            }
          >
            Random Chat
          </Link>
          <Link
            href="/chatrooms"
            className={
              currentPage === 'chatrooms'
                ? 'text-aegean-600 font-semibold'
                : 'text-gray-600 hover:text-aegean-600'
            }
          >
            Chatrooms
          </Link>
          <Link
            href="/private-chats"
            className={
              currentPage === 'private-chats'
                ? 'text-aegean-600 font-semibold'
                : 'text-gray-600 hover:text-aegean-600'
            }
          >
            Private Chats{totalNotifications > 0 && ` (${totalNotifications})`}
          </Link>
        </nav>
      </div>
    </header>
  );
}
