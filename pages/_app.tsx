import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from 'react';
import { Cinzel, Libre_Baskerville } from 'next/font/google';
import { useRouter } from 'next/router';
import FloatingChats from '@/components/FloatingChats';
import MessageRequestNotifications from '@/components/MessageRequestNotifications';
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
  const { socket, initializeSocket, addMessageRequest, addPlannedChat } = useChatStore();
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);

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

  // Restore pending message requests on socket connection/reconnection
  useEffect(() => {
    if (!socket || isHomePage || !mySessionToken) return;

    const restorePendingRequests = async () => {
      try {
        console.log('🔍 Checking for pending message requests...');

        // Fetch all chat sessions
        const { sessions } = await getAllChatSessions();

        // Filter for pending requests where current user is the RECIPIENT
        // user1 = requester (sender), user2 = recipient (receiver)
        const pendingRequests = sessions.filter(
          (session: any) =>
            session.type === 'planned' &&
            session.status === 'waiting' &&
            session.user2_session_token === mySessionToken
        );

        console.log(`📬 Found ${pendingRequests.length} pending message request(s)`);

        // Add each pending request to the store
        pendingRequests.forEach((session: any) => {
          addMessageRequest({
            session_id: session.id,
            requester_username: session.user1_username, // user1 is the requester
            requester_session_token: session.user1_session_token,
            created_at: session.created_at,
          });
        });
      } catch (error) {
        console.error('Error restoring pending requests:', error);
      }
    };

    // Restore on initial connection
    const handleConnect = () => {
      console.log('✅ Socket connected - checking for pending requests...');
      restorePendingRequests();
    };

    // Restore on reconnection
    const handleReconnect = () => {
      console.log('🔄 Socket reconnected - checking for pending requests...');
      restorePendingRequests();
    };

    // If already connected when this effect runs, check immediately
    if (socket.connected) {
      restorePendingRequests();
    }

    socket.on('connect', handleConnect);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, isHomePage, mySessionToken, addMessageRequest]);

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
    </div>
  );
}
