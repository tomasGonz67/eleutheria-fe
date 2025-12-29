import { useState, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { clientApi } from '@/lib/api';

export default function MessageRequestNotifications() {
  const { messageRequests, removeMessageRequest, socket, showNotification } = useChatStore();
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

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
      socket.emit('check_user_online', { uuid: request.requester_session_token });
    });

    // Listen for online status responses
    const handleUserOnlineStatus = (data: { uuid: string; isOnline: boolean }) => {
      setOnlineStatus((prev) => ({
        ...prev,
        [data.uuid]: data.isOnline,
      }));
    };

    socket.on('user_online_status', handleUserOnlineStatus);

    // Periodically recheck online status (every 10 seconds)
    const interval = setInterval(() => {
      messageRequests.forEach((request) => {
        socket.emit('check_user_online', { uuid: request.requester_session_token });
      });
    }, 10000);

    return () => {
      socket.off('user_online_status', handleUserOnlineStatus);
      clearInterval(interval);
    };
  }, [socket, messageRequests]);

  // Filter to only show requests from online users
  const onlineRequests = messageRequests.filter(
    (request) => onlineStatus[request.requester_session_token] === true
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
