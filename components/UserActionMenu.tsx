import { useState, useRef, useEffect } from 'react';
import { clientApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import { isSocketConnected } from '@/lib/socket';

interface UserActionMenuProps {
  username: string;
  discriminator?: string | null; // The discriminator of the user being clicked
  hideDiscriminator?: boolean; // Whether this user has hidden their discriminator
  isOwnPost?: boolean; // Whether this is the current user's own post/message
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function UserActionMenu({
  username,
  discriminator,
  hideDiscriminator = false,
  isOwnPost = false,
  accentColor = '#4D89B0',
  className = '',
  style = {}
}: UserActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = checking, true/false = result
  const [acceptingRequests, setAcceptingRequests] = useState<boolean | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const { socket, showNotification } = useChatStore();

  // Check if this is the current user's own message
  const isOwnUser = isOwnPost;

  // Fetch current user's message request preference when own menu opens
  useEffect(() => {
    if (isOpen && isOwnUser) {
      clientApi.get('/api/session/me')
        .then(res => setAcceptingRequests(res.data.user.accepting_message_requests))
        .catch(() => {});
    }
  }, [isOpen, isOwnUser]);

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
    setIsOpen(false);
    setIsReportOpen(true);
    setReportReason('');
    setReportDetails('');
  };

  const handleSubmitReport = async () => {
    if (!discriminator) return;
    try {
      await clientApi.post('/api/report', {
        discriminator,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      showNotification('success', 'Report submitted', true, 3000);
      setIsReportOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to submit report';
      showNotification('error', msg);
    }
  };

  const handleToggleMessageRequests = async () => {
    try {
      const res = await clientApi.put('/api/session/toggle-message-requests');
      setAcceptingRequests(res.data.accepting_message_requests);
      showNotification(
        'success',
        res.data.accepting_message_requests
          ? 'Message requests turned on'
          : 'Message requests turned off',
        true,
        3000
      );
    } catch (error) {
      showNotification('error', 'Failed to update preference');
    }
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* Clickable Username */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={`underline cursor-pointer ${className}`}
        style={style}
      >
        {username}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface border-2 border-border rounded-lg shadow-lg min-w-[180px]">
          {isOwnUser ? (
            // Options for clicking on your own name
            <>
              {discriminator && (
                <div className="px-4 py-2 border-b border-border-light bg-surface-secondary">
                  <span className="text-xs text-text-faint font-mono">#{discriminator}</span>
                </div>
              )}
            <button
              onClick={handleToggleMessageRequests}
              className="w-full text-left px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition"
            >
              {acceptingRequests === null
                ? '...'
                : acceptingRequests
                  ? '🔕 Turn off message requests'
                  : '🔔 Turn on message requests'}
            </button>
            </>
          ) : (
            // Options for clicking on someone else's name
            <>
              {/* Online Status */}
              <div className="px-4 py-3 border-b border-border-light bg-surface-secondary">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-text-secondary">{username}</span>
                    {discriminator && (
                      <p className="text-xs text-text-faint font-mono">#{hideDiscriminator ? 'XXXXXXXX' : discriminator}</p>
                    )}
                  </div>
                  {isOnline === null ? (
                    <span className="text-xs text-text-muted">Checking...</span>
                  ) : isOnline ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success-text">
                      <span className="w-2 h-2 bg-success rounded-full"></span>
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                      <span className="w-2 h-2 bg-disabled rounded-full"></span>
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={handleSendMessage}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition border-b border-border-light"
              >
                📨 Send message
              </button>
              <button
                onClick={handleReport}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-error-text hover:bg-surface-secondary transition"
              >
                ⚠️ Report
              </button>
            </>
          )}
        </div>
      )}
      {/* Report Modal */}
      {isReportOpen && (
        <div
          className="fixed inset-0 bg-text-inverted bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setIsReportOpen(false); }}
        >
          <div className="bg-surface rounded-lg max-w-md w-full p-6 border-4 border-error">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-text-primary">Report {username}</h2>
              <button onClick={() => setIsReportOpen(false)} className="text-text-muted hover:text-text-secondary text-2xl">
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none"
                >
                  <option value="">Select a reason...</option>
                  <option value="harassment">Harassment</option>
                  <option value="spam">Spam</option>
                  <option value="inappropriate">Inappropriate Content</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1">Details <span className="text-text-faint font-normal">(optional)</span></label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide additional context..."
                  className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none resize-none"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <button
                disabled={!reportReason}
                onClick={handleSubmitReport}
                className="w-full py-3 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed bg-error-hover hover:bg-error-strong"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
