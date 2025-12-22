import { useState, useRef, useEffect } from 'react';

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
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if this is the current user's own message by comparing session tokens
  const isOwnUser = userSessionToken && currentUserSessionToken && userSessionToken === currentUserSessionToken;

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

  const handleSendMessage = () => {
    // TODO: Implement send message functionality
    console.log('Send message to:', username);
    setIsOpen(false);
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
