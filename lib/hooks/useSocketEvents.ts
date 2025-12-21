import { useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';

interface NewMessageData {
  id: number;
  chat_session_id: number;
  sender_session_token: string;
  sender_username: string;
  content: string;
  created_at: string;
}

/**
 * Custom hook that sets up Socket.io event listeners
 * and syncs events with Zustand store
 */
export function useSocketEvents(
  currentUsername: string,
  setChatEndedMessage: (message: string) => void
) {
  const {
    socket,
    initializeSocket,
    cleanupSocket,
    setRandomChatStatus,
    setRandomChatPartner,
    addRandomChatMessage,
    clearRandomChat,
    randomChatSessionId,
  } = useChatStore();

  useEffect(() => {
    // Initialize socket on mount
    initializeSocket();

    return () => {
      // Cleanup on unmount
      cleanupSocket();
    };
  }, []);

  useEffect(() => {
    if (!socket || !currentUsername) return;

    // Listen for when chat starts (both users matched)
    const handleStartChat = (data: {
      session_id: number;
      user1_username: string;
      user2_username: string;
    }) => {
      console.log('Chat started:', data);

      if (data.session_id === randomChatSessionId) {
        // Determine which username is the partner (not me)
        const partner =
          data.user1_username === currentUsername
            ? data.user2_username
            : data.user1_username;

        setRandomChatPartner(partner);
        setRandomChatStatus('matched');
      }
    };

    // Listen for when user leaves
    const handleUserLeft = (data: { session_id: number; username: string }) => {
      console.log('User left:', data);

      if (data.session_id === randomChatSessionId) {
        // Partner left, end chat
        setRandomChatStatus('idle');
      }
    };

    // Listen for new messages
    const handleNewMessage = (data: NewMessageData) => {
      console.log('New message received:', data);

      if (data.chat_session_id === randomChatSessionId) {
        // Add message to store
        addRandomChatMessage({
          id: data.id,
          content: data.content,
          username: data.sender_username,
          is_me: data.sender_username === currentUsername,
          created_at: data.created_at,
        });
      }
    };

    // Listen for session ended (partner disconnected)
    const handleSessionEnded = (data: { session_id: number; reason: string }) => {
      console.log('Session ended:', data);

      if (data.session_id === randomChatSessionId) {
        setChatEndedMessage(data.reason);
        clearRandomChat();
      }
    };

    // Register event listeners
    socket.on('start_chat', handleStartChat);
    socket.on('user_left', handleUserLeft);
    socket.on('new_message', handleNewMessage);
    socket.on('session_ended', handleSessionEnded);

    // Cleanup listeners on unmount or when dependencies change
    return () => {
      socket.off('start_chat', handleStartChat);
      socket.off('user_left', handleUserLeft);
      socket.off('new_message', handleNewMessage);
      socket.off('session_ended', handleSessionEnded);
    };
  }, [socket, currentUsername, randomChatSessionId]);
}
