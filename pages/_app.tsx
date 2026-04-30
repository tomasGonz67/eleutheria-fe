import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from 'react';
import { Cinzel, Libre_Baskerville } from 'next/font/google';
import { useRouter } from 'next/router';
import FloatingChats from '@/components/FloatingChats';
import MessageRequestNotifications from '@/components/MessageRequestNotifications';
import NotificationBanner from '@/components/NotificationBanner';
import Footer from '@/components/Footer';
import LegalModal from '@/components/LegalModal';
import { useChatStore } from '@/store/chatStore';
import { getCurrentUser } from '@/lib/services/session';
import { markNotificationRead } from '@/lib/services/notifications';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre',
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isHomePage = router.pathname === '/';
  const { socket, initializeSocket, addMessageRequest, addPlannedChat, notification, dismissNotification, plannedChats, setMyUsername } = useChatStore();
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'rules' | null>(null);

  // Dismiss notification when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      dismissNotification();
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, dismissNotification]);

  // Initialize socket connection on all pages except home
  useEffect(() => {
    if (!isHomePage && !socket) {
      initializeSocket();
    }
  }, [isHomePage, socket, initializeSocket]);

  // Get current user's session token + username. Re-runs when the tab
  // becomes visible again (mobile bfcache restores leave the SSR-seeded
  // username stale even though the cookie still authenticates writes).
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await getCurrentUser();
        setMySessionToken(response.user.session_token);
        setMyUsername(response.user.username || null);
      } catch (error) {
        // User not authenticated
      }
    };

    fetchCurrentUser();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCurrentUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setMyUsername]);

  // Rejoin sessions when socket connects/reconnects (only for open UI)
  useEffect(() => {
    if (!socket || isHomePage) return;

    const handleConnect = () => {
      // Rejoin all open floaters
      plannedChats.forEach((chat) => {
        socket.emit('join_session', { session_id: chat.id });
      });

      // If on a chat page, rejoin that session too
      if (router.pathname === '/private-chats/[id]') {
        const sessionId = parseInt(router.query.id as string);
        if (sessionId) {
          socket.emit('join_session', { session_id: sessionId });
        }
      }

    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, isHomePage, plannedChats, router.pathname, router.query.id]);

  // Listen for reply notifications on all pages except home
  useEffect(() => {
    if (!socket || isHomePage) return;

    const handleReplyNotification = (data: { notification_id?: number; from_username: string; post_id: number; parent_post_id?: number; forum_id: number }) => {
      const { showNotification } = useChatStore.getState();
      const targetUrl = data.parent_post_id
        ? `/forums/${data.forum_id}/comments/${data.parent_post_id}?highlight=${data.post_id}`
        : `/forums/${data.forum_id}/comments/${data.post_id}`;
      const onAction = data.notification_id
        ? () => { markNotificationRead(data.notification_id!).catch(() => {}); }
        : undefined;
      showNotification('info', `${data.from_username} replied to your post`, true, 8000, 'See now', targetUrl, onAction);
    };

    socket.on('new_reply_notification', handleReplyNotification);

    return () => {
      socket.off('new_reply_notification', handleReplyNotification);
    };
  }, [socket, isHomePage]);

  // Listen for message requests and chat acceptance on all pages except home
  useEffect(() => {
    if (!socket || isHomePage) return;

    const handleNewMessageRequest = (data: any) => {
      addMessageRequest({
        session_id: data.session_id,
        requester_username: data.requester_username,
        requester_discriminator: data.requester_discriminator,
        created_at: data.created_at,
      });
    };

    const handleChatRequestAccepted = (data: any) => {
      // Open floating chat window for both users
      addPlannedChat({
        id: data.session_id,
        inviteCode: data.session_id.toString(),
        partnerUsername: data.partner_username,
        isMinimized: false,
        unreadCount: 0,
        created_at: data.created_at,
      });
    };

    socket.on('new_message_request', handleNewMessageRequest);
    socket.on('chat_request_accepted', handleChatRequestAccepted);

    return () => {
      socket.off('new_message_request', handleNewMessageRequest);
      socket.off('chat_request_accepted', handleChatRequestAccepted);
    };
  }, [socket, isHomePage, addMessageRequest, addPlannedChat]);

  return (
    <div className={`${cinzel.variable} ${libreBaskerville.variable} min-h-screen flex flex-col`}>
      <Component {...pageProps} />
      {/* Show floating chats on all pages except home */}
      {!isHomePage && <FloatingChats />}
      {/* Show message request notifications on all pages except home */}
      {!isHomePage && <MessageRequestNotifications />}
      {/* Show global notification banner */}
      {notification && (
        <NotificationBanner
          type={notification.type}
          message={notification.message}
          onDismiss={dismissNotification}
          autoDismiss={notification.autoDismiss}
          autoDismissDelay={notification.autoDismissDelay}
          actionLabel={notification.actionLabel}
          actionHref={notification.actionHref}
          onAction={notification.onAction}
        />
      )}
      <Footer
        onOpenTerms={() => setLegalModal('terms')}
        onOpenPrivacy={() => setLegalModal('privacy')}
        onOpenRules={() => setLegalModal('rules')}
      />
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
