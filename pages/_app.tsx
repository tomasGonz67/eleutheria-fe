import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from 'react';
import { Cinzel, Libre_Baskerville } from 'next/font/google';
import { useRouter } from 'next/router';
import FloatingChats from '@/components/FloatingChats';
import MessageRequestNotifications from '@/components/MessageRequestNotifications';
import { useChatStore } from '@/store/chatStore';

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
  const { socket, addMessageRequest, addPlannedChat } = useChatStore();

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
