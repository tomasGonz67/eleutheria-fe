import { useState, useRef, useEffect } from 'react';
import { clientApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';

interface UserActionMenuProps {
  username: string;
  userSessionToken?: string | null; // The session token of the user being clicked
  currentUserSessionToken?: string | null; // The session token of the logged-in user
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function UserActionMenu({
  username,
  userSessionToken,
  currentUserSessionToken,
  accentColor = '#4D89B0',
  className = '',
  style = {}
}: UserActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = checking, true/false = result
  const menuRef = useRef<HTMLDivElement>(null);
  const { socket } = useChatStore();

  // Check if this is the current user's own message by comparing session tokens
  const isOwnUser = userSessionToken && currentUserSessionToken && userSessionToken === currentUserSessionToken;

  // Check online status when menu opens
  useEffect(() => {
    if (isOpen && socket && userSessionToken && !isOwnUser) {
      console.log('🔍 Checking online status for:', username, userSessionToken);
      setIsOnline(null); // Reset to checking state

      // Listen for response
      const handleOnlineStatus = (data: { uuid: string; isOnline: boolean }) => {
        console.log('📡 Received online status:', data);
        if (data.uuid === userSessionToken) {
          setIsOnline(data.isOnline);
        }
      };

      socket.on('user_online_status', handleOnlineStatus);

      // Request online status
      socket.emit('check_user_online', { uuid: userSessionToken });

      return () => {
        socket.off('user_online_status', handleOnlineStatus);
      };
    }
  }, [isOpen, socket, userSessionToken, username, isOwnUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!userSessionToken) {
      alert('Cannot send message request - user session not found');
      setIsOpen(false);
      return;
    }

    try {
      const response = await clientApi.post('/api/chat/match/planned', {
        recipientId: userSessionToken
      });

      console.log('Message request sent:', response.data);
      alert(`Message request sent to ${username}!`);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error sending message request:', error);
      alert(error.response?.data?.error || 'Failed to send message request');
      setIsOpen(false);
    }
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    console.log('Report user:', username);
    setIsOpen(false);
  };

  const handleToggleMessageRequests = () => {
    // TODO: Implement toggle message requests functionality
    console.log('Toggle message requests');
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* Clickable Username */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`underline cursor-pointer ${className}`}
        style={style}
      >
        {username}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-lg min-w-[180px]">
          {isOwnUser ? (
            // Options for clicking on your own name
            <button
              onClick={handleToggleMessageRequests}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              🔕 Turn off message requests
            </button>
          ) : (
            // Options for clicking on someone else's name
            <>
              {/* Online Status */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{username}</span>
                  {isOnline === null ? (
                    <span className="text-xs text-gray-500">Checking...</span>
                  ) : isOnline ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={handleSendMessage}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition border-b border-gray-200"
              >
                📨 Send message
              </button>
              <button
                onClick={handleReport}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-gray-50 transition"
              >
                ⚠️ Report
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
