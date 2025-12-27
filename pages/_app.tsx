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
  const { socket, initializeSocket, addMessageRequest, addPlannedChat, notification, dismissNotification, incrementChatUnread, incrementUnread, plannedChats } = useChatStore();
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

  // Join Socket.io rooms for all active chats (for message notifications)
  useEffect(() => {
    if (isHomePage || !mySessionToken || !socket) return;

    const joinAllChatRooms = async () => {
      try {
        const { sessions } = await getAllChatSessions();
        const activePlannedChats = sessions.filter(
          (session: any) => session.type === 'planned' && session.status === 'active'
        );

        // Join Socket.io rooms for all active chats (don't open floaters, just join for notifications)
        activePlannedChats.forEach((session: any) => {
          socket.emit('join_session', { session_id: session.id });
        });
      } catch (error) {
        console.error('Error joining chat rooms:', error);
      }
    };

    joinAllChatRooms();
  }, [isHomePage, mySessionToken, socket]);

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

    // Listen for new messages to track unread counts
    const handleNewMessage = async (data: any) => {
      const sessionId = data.chat_session_id;
      const isMyMessage = data.sender_session_token === mySessionToken;

      // Don't increment for my own messages
      if (isMyMessage) return;

      // Check if this chat is opened as a floater
      const floaterChat = plannedChats.find((chat) => chat.id === sessionId);

      if (floaterChat) {
        // Chat is open as floater - only increment if minimized
        if (floaterChat.isMinimized) {
          incrementUnread(sessionId);
        }
      } else {
        // Chat is not open as floater - increment global unread count
        incrementChatUnread(sessionId);
      }
    };

    socket.on('new_message_request', handleNewMessageRequest);
    socket.on('chat_request_accepted', handleChatRequestAccepted);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message_request', handleNewMessageRequest);
      socket.off('chat_request_accepted', handleChatRequestAccepted);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, isHomePage, addMessageRequest, addPlannedChat, incrementChatUnread, incrementUnread, plannedChats]);

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
