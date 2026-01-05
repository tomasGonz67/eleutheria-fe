import { useState, useRef, useEffect } from 'react';
import { clientApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { isSocketConnected } from '@/lib/socket';

interface UserActionMenuProps {
  username: string;
  discriminator?: string | null; // The discriminator of the user being clicked
  isOwnPost?: boolean; // Whether this is the current user's own post/message
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function UserActionMenu({
  username,
  discriminator,
  isOwnPost = false,
  accentColor = '#4D89B0',
  className = '',
  style = {}
}: UserActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = checking, true/false = result
  const menuRef = useRef<HTMLDivElement>(null);
  const { socket, showNotification } = useChatStore();

  // Check if this is the current user's own message
  const isOwnUser = isOwnPost;

  // Check online status when menu opens
  useEffect(() => {
    if (isOpen && socket && discriminator && !isOwnUser) {
      setIsOnline(null); // Reset to checking state

      // Check if socket is actually connected
      if (!isSocketConnected()) {
        setIsOnline(false); // Default to offline if socket not connected
        return;
      }

      // Listen for response
      const handleOnlineStatus = (data: { discriminator: string; isOnline: boolean }) => {
        if (data.discriminator === discriminator) {
          setIsOnline(data.isOnline);
        }
      };

      socket.on('user_online_status', handleOnlineStatus);

      try {
        // Request online status using discriminator
        socket.emit('check_user_online', { discriminator });
      } catch (error) {
        setIsOnline(false);
      }

      return () => {
        socket.off('user_online_status', handleOnlineStatus);
      };
    }
  }, [isOpen, socket, discriminator, username, isOwnUser]);

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
    if (!discriminator) {
      showNotification('error', 'Cannot send message request - user discriminator not found');
      setIsOpen(false);
      return;
    }

    // Check socket connection before sending request
    if (!isSocketConnected()) {
      showNotification('error', 'Connection lost. Please refresh the page and try again.');
      setIsOpen(false);
      return;
    }

    try {
      const response = await clientApi.post('/api/chat/match/planned', {
        recipientDiscriminator: discriminator
      });

      showNotification('success', `Message request sent to ${username}!`, true, 3000);
      setIsOpen(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send message request';
      showNotification('error', errorMessage);
      setIsOpen(false);
    }
  };

  const handleReport = () => {
    // TODO: Implement report functionality
    setIsOpen(false);
  };

  const handleToggleMessageRequests = () => {
    // TODO: Implement toggle message requests functionality
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* Clickable Username */}
      <button
        onClick={() => {
          console.log('Clicked user discriminator:', discriminator);
          setIsOpen(!isOpen);
        }}
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
