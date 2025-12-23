import { useChatStore } from '@/store/chatStore';
import { clientApi } from '@/lib/api';

export default function MessageRequestNotifications() {
  const { messageRequests, removeMessageRequest } = useChatStore();

  const handleAccept = async (sessionId: number) => {
    try {
      await clientApi.put(`/api/chat/${sessionId}/accept`);

      // Remove notification (chat window will open via Socket.io for both users)
      removeMessageRequest(sessionId);

      console.log('Chat request accepted:', sessionId);
    } catch (error: any) {
      console.error('Error accepting chat request:', error);
      alert(error.response?.data?.error || 'Failed to accept chat request');
    }
  };

  const handleReject = async (sessionId: number) => {
    try {
      await clientApi.delete(`/api/chat/${sessionId}/reject`);
      removeMessageRequest(sessionId);
    } catch (error: any) {
      console.error('Error rejecting chat request:', error);
      alert(error.response?.data?.error || 'Failed to reject chat request');
    }
  };

  if (messageRequests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {messageRequests.map((request) => (
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
