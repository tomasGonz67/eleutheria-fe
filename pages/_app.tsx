import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from 'react';
import { Cinzel, Libre_Baskerville } from 'next/font/google';
import { useRouter } from 'next/router';
import FloatingChats from '@/components/FloatingChats';
import MessageRequestNotifications from '@/components/MessageRequestNotifications';
import NotificationBanner from '@/components/NotificationBanner';
import { useChatStore } from '@/store/chatStore';
import { getAllChatSessions } from '@/lib/services/chat';
import { getCurrentUser } from '@/lib/services/session';

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
  const { socket, initializeSocket, addMessageRequest, addPlannedChat, notification, dismissNotification } = useChatStore();
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);

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
      console.log('🔌 Initializing Socket.IO connection...');
      initializeSocket();
    }
  }, [isHomePage, socket, initializeSocket]);

  // Get current user's session token
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await getCurrentUser();
        setMySessionToken(response.user.session_token);
      } catch (error) {
        // User not authenticated
        console.log('User not authenticated');
      }
    };

    fetchCurrentUser();
  }, []);

  // Restore active planned chats on page load
  useEffect(() => {
    if (isHomePage || !mySessionToken) return;

    const restoreChats = async () => {
      try {
        // Fetch all chat sessions
        const { sessions } = await getAllChatSessions();

        // Filter for active planned chats
        const activePlannedChats = sessions.filter(
          (session: any) => session.type === 'planned' && session.status === 'active'
        );

        console.log('active');

        // Restore each chat to the store
        activePlannedChats.forEach((session: any) => {
          // Determine partner username (the one that's not me)
          const isUser1 = session.user1_session_token === mySessionToken;
          const partnerUsername = isUser1 ? session.user2_username : session.user1_username;

          addPlannedChat({
            id: session.id,
            inviteCode: session.id.toString(),
            partnerUsername: partnerUsername,
            isMinimized: false,
            unreadCount: 0,
          });
        });
      } catch (error) {
        console.error('Error restoring chats:', error);
      }
    };

    restoreChats();
  }, [isHomePage, mySessionToken, addPlannedChat]);

  // Listen for message requests and chat acceptance on all pages except home
  useEffect(() => {
    if (!socket || isHomePage) return;

    const handleNewMessageRequest = (data: any) => {
      console.log('🔔 NEW MESSAGE REQUEST RECEIVED:', data);
      addMessageRequest({
        session_id: data.session_id,
        requester_username: data.requester_username,
        requester_session_token: data.requester_session_token,
        created_at: data.created_at,
      });
    };

    const handleChatRequestAccepted = (data: any) => {
      console.log('✅ CHAT REQUEST ACCEPTED:', data);
      // Open floating chat window for both users
      addPlannedChat({
        id: data.session_id,
        inviteCode: data.session_id.toString(),
        partnerUsername: data.partner_username,
        isMinimized: false,
        unreadCount: 0,
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
    <div className={`${cinzel.variable} ${libreBaskerville.variable}`}>
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
        />
      )}
    </div>
  );
}
