import Link from 'next/link';
import { useRouter } from 'next/router';
import { useChatStore } from '@/store/chatStore';
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/services/session';
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification } from '@/lib/services/notifications';
import { clientApi } from '@/lib/api';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [rejectingMessages, setRejectingMessages] = useState(false);
  const [appearOffline, setAppearOffline] = useState(false);
  const [hideDiscriminator, setHideDiscriminator] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellDesktopRef = useRef<HTMLDivElement>(null);
  const bellMobileRef = useRef<HTMLDivElement>(null);
  const settingsDesktopRef = useRef<HTMLDivElement>(null);
  const settingsMobileRef = useRef<HTMLDivElement>(null);

  // Fetch notification count from API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getCurrentUser();
        setNotificationCount(response.user.notifications || 0);
        setRejectingMessages(!response.user.accepting_message_requests);
        setAppearOffline(response.user.appear_offline || false);
        setHideDiscriminator(response.user.hide_discriminator || false);
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

    setNotificationCount(0);

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

  // Close mobile menu, bell, and settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      const clickedInsideBell =
        (bellDesktopRef.current && bellDesktopRef.current.contains(event.target as Node)) ||
        (bellMobileRef.current && bellMobileRef.current.contains(event.target as Node));
      if (!clickedInsideBell) {
        setIsBellOpen(false);
      }
      const clickedInsideSettings =
        (settingsDesktopRef.current && settingsDesktopRef.current.contains(event.target as Node)) ||
        (settingsMobileRef.current && settingsMobileRef.current.contains(event.target as Node));
      if (!clickedInsideSettings) {
        setIsSettingsOpen(false);
      }
    };

    if (isMobileMenuOpen || isBellOpen || isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isBellOpen, isSettingsOpen]);

  // Read dark mode preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('eleutheria_dark_mode');
    if (stored === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('eleutheria_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    const targetUrl = notif.parent_post_id
      ? `/forums/${notif.forum_id}/comments/${notif.parent_post_id}?highlight=${notif.post_id}`
      : `/forums/${notif.forum_id}/comments/${notif.post_id}`;
    if (!notif.is_read) {
      try {
        markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    }
    setIsBellOpen(false);
    router.push(targetUrl);
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
    <div className="absolute right-0 top-full mt-2 bg-surface border-2 border-border rounded-lg shadow-lg w-80 z-50 max-h-[400px] flex flex-col">
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <span className="font-semibold text-text-primary text-sm">Notifications</span>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-aegean-600 hover:text-aegean-700"
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {isLoadingNotifications ? (
          <div className="px-4 py-6 text-center text-text-muted text-sm">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-text-muted text-sm">No notifications</div>
        ) : (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full text-left px-4 py-3 border-b border-border-lighter last:border-b-0 hover:bg-surface-secondary transition ${
                !notif.is_read ? 'bg-aegean-50' : ''
              }`}
            >
              <div className="text-sm text-text-primary">
                <span className="font-semibold">{notif.from_username}</span>
                {' replied to your post'}
              </div>
              {notif.content_preview && (
                <div className="text-xs text-text-muted mt-1 truncate">
                  {notif.content_preview}
                </div>
              )}
              <div className="text-xs text-text-faint mt-1">{timeAgo(notif.created_at)}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const gearIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const settingsDropdown = (
    <div className="absolute right-0 top-full mt-2 bg-surface border-2 border-border rounded-lg shadow-lg min-w-[220px] z-50">
      <div className="px-4 py-3 border-b border-border-light">
        <span className="font-semibold text-text-primary text-sm">Settings</span>
      </div>
      <button
        onClick={() => { setIsSettingsOpen(false); setIsResetModalOpen(true); }}
        className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary transition border-b border-border-lighter flex items-center gap-3"
      >
        <span>🔄</span>
        <span>Reset User ID</span>
      </button>
      <button
        onClick={handleToggleDarkMode}
        className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary transition border-b border-border-lighter flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span>{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors ${darkMode ? 'bg-aegean-600' : 'bg-disabled-bg'}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>
      <button
        onClick={async () => {
          try {
            const res = await clientApi.put('/api/session/toggle-message-requests');
            setRejectingMessages(!res.data.accepting_message_requests);
          } catch (error) {
            console.error('Error toggling message requests:', error);
          }
        }}
        className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary transition border-b border-border-lighter flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span>🔕</span>
          <span>Reject Message Invitations</span>
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors ${rejectingMessages ? 'bg-error' : 'bg-disabled-bg'}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${rejectingMessages ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>
      <button
        onClick={async () => {
          try {
            const res = await clientApi.put('/api/session/toggle-appear-offline');
            setAppearOffline(res.data.appear_offline);
          } catch (error) {
            console.error('Error toggling appear offline:', error);
          }
        }}
        className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary transition border-b border-border-lighter flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span>👻</span>
          <span>Appear Offline</span>
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors ${appearOffline ? 'bg-error' : 'bg-disabled-bg'}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${appearOffline ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>
      <button
        onClick={async () => {
          try {
            const res = await clientApi.put('/api/session/toggle-hide-discriminator');
            setHideDiscriminator(res.data.hide_discriminator);
          } catch (error) {
            console.error('Error toggling hide discriminator:', error);
          }
        }}
        className="w-full text-left px-4 py-3 text-sm text-text-secondary hover:bg-surface-secondary transition flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span>🔒</span>
          <span>Hide Discriminator</span>
        </div>
        <div className={`relative w-10 h-5 rounded-full transition-colors ${hideDiscriminator ? 'bg-error' : 'bg-disabled-bg'}`}>
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface rounded-full shadow transition-transform ${hideDiscriminator ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </button>
    </div>
  );

  return (
    <>
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
                  ? 'font-semibold text-accent-chat'
                  : 'text-text-tertiary hover:text-accent-chat'
              }
            >
              {link.label}
            </Link>
          ))}

          {/* Bell icon (desktop) */}
          <div className="relative" ref={bellDesktopRef}>
            <button
              onClick={() => { setIsBellOpen(!isBellOpen); setIsSettingsOpen(false); }}
              className="relative text-text-tertiary hover:text-text-primary p-1"
            >
              {bellIcon}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-text-on-color text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {isBellOpen && notificationDropdown}
          </div>

          {/* Settings gear (desktop) */}
          <div className="relative" ref={settingsDesktopRef}>
            <button
              onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsBellOpen(false); }}
              className="text-text-tertiary hover:text-text-primary p-1"
            >
              {gearIcon}
            </button>
            {isSettingsOpen && settingsDropdown}
          </div>
        </nav>

        {/* Mobile: bell + settings + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          {/* Bell icon (mobile) */}
          <div className="relative" ref={bellMobileRef}>
            <button
              onClick={() => { setIsBellOpen(!isBellOpen); setIsMobileMenuOpen(false); setIsSettingsOpen(false); }}
              className="relative text-text-secondary p-2"
            >
              {bellIcon}
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-text-on-color text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            {isBellOpen && notificationDropdown}
          </div>

          {/* Settings gear (mobile) */}
          <div className="relative" ref={settingsMobileRef}>
            <button
              onClick={() => { setIsSettingsOpen(!isSettingsOpen); setIsBellOpen(false); setIsMobileMenuOpen(false); }}
              className="text-text-secondary p-2"
            >
              {gearIcon}
            </button>
            {isSettingsOpen && settingsDropdown}
          </div>

          {/* Hamburger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setIsMobileMenuOpen(!isMobileMenuOpen); setIsBellOpen(false); setIsSettingsOpen(false); }}
              className="text-text-secondary p-2"
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
              <div className="absolute right-0 top-full mt-2 bg-surface border-2 border-border rounded-lg shadow-lg min-w-[180px] z-50">
                {navLinks.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 text-sm font-semibold border-b border-border-lighter last:border-b-0 ${
                      currentPage === link.key ? 'bg-surface-secondary text-accent-chat' : 'hover:bg-surface-secondary'
                    }`}
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

    {/* Reset User ID Confirmation Modal */}
    {isResetModalOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={(e) => { if (e.target === e.currentTarget) setIsResetModalOpen(false); }}
      >
        <div className="bg-surface rounded-lg max-w-md w-full p-6 border-4 border-error">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">Reset User ID</h2>
            <button onClick={() => setIsResetModalOpen(false)} className="text-text-muted hover:text-text-secondary text-2xl">
              &times;
            </button>
          </div>
          <p className="text-text-tertiary mb-2">Are you sure you want to reset your User ID?</p>
          <p className="text-sm text-text-muted mb-6">
            This will generate a new anonymous identity. Your current username, session, and all associated data (posts, messages, notifications) will no longer be linked to you. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 py-3 border-2 border-border text-text-tertiary rounded-lg transition font-semibold hover:bg-surface-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await clientApi.post('/api/session/reset');
                } catch {}
                localStorage.removeItem('eleutheria_username');
                router.push('/');
                window.location.href = '/';
              }}
              className="flex-1 py-3 bg-error text-text-on-color rounded-lg transition font-semibold hover:bg-error-hover"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
