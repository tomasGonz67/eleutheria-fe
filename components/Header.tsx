import Link from 'next/link';
import { useRouter } from 'next/router';
import { useChatStore } from '@/store/chatStore';
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/services/session';
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification } from '@/lib/services/notifications';

interface HeaderProps {
  currentPage?: 'feed' | 'forums' | 'random-chat' | 'chatrooms' | 'private-chats';
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Header({ currentPage }: HeaderProps) {
  const router = useRouter();
  const { socket } = useChatStore();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Fetch notification count from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getCurrentUser();
        setNotificationCount(response.user.notifications || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  // Listen for real-time notification count updates
  useEffect(() => {
    if (!socket) return;

    const handleNotificationUpdate = (data: { action: string }) => {
      if (data.action === 'increment') {
        setNotificationCount((prev) => prev + 1);
      } else if (data.action === 'decrement') {
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } else if (data.action === 'reset') {
        setNotificationCount(0);
      }
    };

    socket.on('notification_count_updated', handleNotificationUpdate);

    return () => {
      socket.off('notification_count_updated', handleNotificationUpdate);
    };
  }, [socket]);

  // Fetch full notifications when bell dropdown opens
  useEffect(() => {
    if (!isBellOpen) return;

    const fetchNotifs = async () => {
      setIsLoadingNotifications(true);
      try {
        const response = await getNotifications();
        setNotifications(response.notifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifs();
  }, [isBellOpen]);

  // Also refresh notification list when a new one arrives while dropdown is open
  useEffect(() => {
    if (!socket) return;

    const handleNewReply = () => {
      if (isBellOpen) {
        getNotifications().then((res) => setNotifications(res.notifications)).catch(() => {});
      }
    };

    socket.on('new_reply_notification', handleNewReply);
    return () => { socket.off('new_reply_notification', handleNewReply); };
  }, [socket, isBellOpen]);

  // Close mobile menu and bell when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };

    if (isMobileMenuOpen || isBellOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isBellOpen]);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    }
    setIsBellOpen(false);
    router.push(`/forums/${notif.forum_id}/comments/${notif.post_id}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const navLinks = [
    { href: '/feed', label: 'Feed', key: 'feed' as const },
    { href: '/forums', label: 'Forums', key: 'forums' as const },
    { href: '/chat/random', label: 'Random Chat', key: 'random-chat' as const },
    { href: '/chatrooms', label: 'Chatrooms', key: 'chatrooms' as const },
    { href: '/private-chats', label: 'Private Chats', key: 'private-chats' as const },
  ];

  const bellIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );

  const notificationDropdown = (
    <div className="absolute right-0 top-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg w-80 z-50 max-h-[400px] flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">Notifications</span>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {isLoadingNotifications ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">No notifications</div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition ${
                !notif.is_read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-sm text-gray-800">
                <span className="font-semibold">{notif.from_username}</span>
                {' replied to your post'}
              </div>
              {notif.content_preview && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {notif.content_preview}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">{timeAgo(notif.created_at)}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <header className="bg-marble-200 border-b-4 border-gold-600 shadow-sm">
      <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-3xl font-bold text-aegean-700 hover:text-gold-600 transition-colors tracking-wide">
          ΕΛΕΥΘΕΡΙΑ
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-4 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={
                currentPage === link.key
                  ? 'font-semibold'
                  : 'text-gray-600'
              }
              style={currentPage === link.key ? { color: '#AA633F' } : {}}
              onMouseEnter={(e) => e.currentTarget.style.color = '#AA633F'}
              onMouseLeave={(e) => currentPage !== link.key ? e.currentTarget.style.color = '#6b7280' : null}
            >
              {link.label}
            </Link>
          ))}

          {/* Bell icon (desktop) */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setIsBellOpen(!isBellOpen)}
              className="relative text-gray-600 hover:text-gray-800 p-1"
            >
              {bellIcon}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {isBellOpen && notificationDropdown}
          </div>
        </nav>

        {/* Mobile: bell + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {/* Bell icon (mobile) */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setIsBellOpen(!isBellOpen); setIsMobileMenuOpen(false); }}
              className="relative text-gray-700 p-2"
            >
              {bellIcon}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {isBellOpen && notificationDropdown}
          </div>

          {/* Hamburger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setIsBellOpen(false); }}
              className="text-gray-700 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Mobile dropdown */}
            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[180px] z-50">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 text-sm font-semibold border-b border-gray-100 last:border-b-0 ${
                      currentPage === link.key ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    style={currentPage === link.key ? { color: '#AA633F' } : { color: '#374151' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
