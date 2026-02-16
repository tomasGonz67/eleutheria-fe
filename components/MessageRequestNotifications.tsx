import { useState, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { clientApi } from '@/lib/api';

export default function MessageRequestNotifications() {
  const { messageRequests, removeMessageRequest, socket, showNotification } = useChatStore();
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [, setTick] = useState(0);

  // Calculate time remaining for a request (10-second inactivity window)
  const getTimeRemaining = (createdAt: string): number => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const expiresAt = created + 10000;
    const remaining = expiresAt - now;
    return Math.max(0, Math.floor(remaining / 1000));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Tick every second for countdown + auto-remove expired requests
  useEffect(() => {
    if (messageRequests.length === 0) return;
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
      // Auto-remove expired requests
      messageRequests.forEach((request) => {
        if (getTimeRemaining(request.created_at) <= 0) {
          removeMessageRequest(request.session_id);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [messageRequests]);

  const handleAccept = async (sessionId: number) => {
    try {
      await clientApi.put(`/api/chat/${sessionId}/accept`);

      // Mark session as read (clear notification)
      try {
        await clientApi.put(`/api/chat/${sessionId}/mark-read`);
      } catch (error) {
        // Error marking session as read
      }

      // Remove notification (chat window will open via Socket.io for both users)
      removeMessageRequest(sessionId);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Failed to accept chat request');

      // Remove notification even on error (e.g., if expired)
      removeMessageRequest(sessionId);
    }
  };

  const handleReject = async (sessionId: number) => {
    try {
      // Mark session as read FIRST (before deleting session)
      try {
        await clientApi.put(`/api/chat/${sessionId}/mark-read`);
      } catch (error) {
        // Error marking session as read
      }

      // Then delete the session
      await clientApi.delete(`/api/chat/${sessionId}/reject`);

      removeMessageRequest(sessionId);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Failed to reject chat request');

      // Remove notification even on error (e.g., if expired)
      removeMessageRequest(sessionId);
    }
  };

  // Check online status for all requesters
  useEffect(() => {
    if (!socket) return;

    // Check online status for each requester
    messageRequests.forEach((request) => {
      socket.emit('check_user_online', { discriminator: request.requester_discriminator });
    });

    // Listen for online status responses
    const handleUserOnlineStatus = (data: { discriminator: string; isOnline: boolean }) => {
      setOnlineStatus((prev) => ({
        ...prev,
        [data.discriminator]: data.isOnline,
      }));
    };

    socket.on('user_online_status', handleUserOnlineStatus);

    // Periodically recheck online status (every 10 seconds)
    const interval = setInterval(() => {
      messageRequests.forEach((request) => {
        socket.emit('check_user_online', { discriminator: request.requester_discriminator });
      });
    }, 10000);

    return () => {
      socket.off('user_online_status', handleUserOnlineStatus);
      clearInterval(interval);
    };
  }, [socket, messageRequests]);

  // Filter to only show requests from online users
  const onlineRequests = messageRequests.filter(
    (request) => onlineStatus[request.requester_discriminator] === true
  );

  if (onlineRequests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {onlineRequests.map((request) => (
        <div
          key={request.session_id}
          className="bg-blue-600 text-white rounded-lg shadow-lg p-4 min-w-[280px] flex items-center justify-between"
        >
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {request.requester_username} wants to chat
            </p>
            <p className="text-xs text-red-300 font-bold mt-1">
              {formatTime(getTimeRemaining(request.created_at))}
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            {/* Accept button - Green checkmark */}
            <button
              onClick={() => handleAccept(request.session_id)}
              className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
              title="Accept"
            >
              ✓
            </button>
            {/* Reject button - Red X */}
            <button
              onClick={() => handleReject(request.session_id)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition"
              title="Reject"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
