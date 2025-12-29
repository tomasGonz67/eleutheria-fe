import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { getAllChatSessions } from '@/lib/services/chat';
import { getCurrentUser } from '@/lib/services/session';
import UserActionMenu from '@/components/UserActionMenu';
import { useChatStore } from '@/store/chatStore';

interface ChatSession {
  id: number;
  type: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  user1_username: string;
  user2_username: string;
  user1_session_token: string;
  user2_session_token: string;
}

export default function PrivateChatsPage() {
  const router = useRouter();
  const { plannedChats, showNotification, socket } = useChatStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0); // Force re-render every second for countdown

  // Calculate time remaining for a waiting session (10 seconds expiration)
  const getTimeRemaining = (createdAt: string): number => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const expiresAt = created + 10000; // 10 seconds
    const remaining = expiresAt - now;
    return Math.max(0, Math.floor(remaining / 1000));
  };

  // Format seconds as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const userResponse = await getCurrentUser();
        setMySessionToken(userResponse.user.session_token);

        // Get all chat sessions
        const { sessions: allSessions } = await getAllChatSessions();

        // Filter for planned chats only
        const plannedSessions = allSessions.filter(
          (session: ChatSession) => session.type === 'planned'
        );

        setSessions(plannedSessions);
      } catch (error) {
        // Error fetching private chats
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update countdown every second for UI display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check for expired sessions every second and trigger cleanup
  useEffect(() => {
    if (!socket || sessions.length === 0) return;

    const interval = setInterval(() => {
      sessions.forEach((session) => {
        if (session.status === 'waiting') {
          const timeRemaining = getTimeRemaining(session.created_at);

          // If countdown hit 0, trigger expiration via Socket.io
          if (timeRemaining === 0) {
            socket.emit('expire_session', { session_id: session.id });
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [socket, sessions]);

  // Listen for real-time session updates from backend
  useEffect(() => {
    if (!socket) return;

    const refetchSessions = async () => {
      try {
        // Refetch all chat sessions
        const { sessions: allSessions } = await getAllChatSessions();
        const plannedSessions = allSessions.filter(
          (session: ChatSession) => session.type === 'planned'
        );
        setSessions(plannedSessions);
      } catch (error) {
        // Error refetching sessions
      }
    };

    const handleSessionExpired = async () => {
      await refetchSessions();
    };

    const handleNewMessageRequest = async (data: any) => {
      await refetchSessions();
    };

    const handleChatRequestAccepted = async (data: any) => {
      // Update the session's created_at timestamp to reset the timer
      if (data.created_at && data.session_id) {
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === data.session_id
              ? { ...session, status: 'active', created_at: data.created_at }
              : session
          )
        );
      }
      await refetchSessions();
    };

    const handleNewMessage = (data: any) => {
      // Update the session's created_at timestamp to reset the timer
      if (data.session_created_at) {
        setSessions((prevSessions) =>
          prevSessions.map((session) =>
            session.id === data.chat_session_id
              ? { ...session, created_at: data.session_created_at }
              : session
          )
        );
      }
    };

    socket.on('session_expired', handleSessionExpired);
    socket.on('new_message_request', handleNewMessageRequest);
    socket.on('chat_request_accepted', handleChatRequestAccepted);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('session_expired', handleSessionExpired);
      socket.off('new_message_request', handleNewMessageRequest);
      socket.off('chat_request_accepted', handleChatRequestAccepted);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  const openChat = (sessionId: number) => {
    router.push(`/private-chats/${sessionId}`);
  };

  const openChatAsFloater = (session: ChatSession) => {
    const { addPlannedChat, removePlannedChat, plannedChats } = require('@/store/chatStore').useChatStore.getState();

    // Check if this chat is already open as a floater
    const existingChat = plannedChats.find((chat: any) => chat.id === session.id);

    if (existingChat) {
      // If already open, close it
      removePlannedChat(session.id);
    } else {
      // Open it as a floater
      const isUser1 = session.user1_session_token === mySessionToken;
      const partnerUsername = isUser1 ? session.user2_username : session.user1_username;

      addPlannedChat({
        id: session.id,
        inviteCode: `chat-${session.id}`,
        partnerUsername: partnerUsername,
        isMinimized: false,
        unreadCount: 0,
        status: session.status as 'active' | 'ended',
      });
    }
  };

  const handleAcceptRequest = async (sessionId: number) => {
    try {
      const { clientApi } = await import('@/lib/api');
      await clientApi.put(`/api/chat/${sessionId}/accept`);

      // Mark session as read (clear notification)
      try {
        await clientApi.put(`/api/chat/${sessionId}/mark-read`);
      } catch (error) {
        // Error marking session as read
      }

      // Refresh the sessions list
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Failed to accept chat request');

      // Refresh the sessions list to remove expired/invalid requests
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    }
  };

  const handleRejectRequest = async (sessionId: number) => {
    try {
      const { clientApi } = await import('@/lib/api');

      // Mark session as read FIRST (before deleting session)
      try {
        await clientApi.put(`/api/chat/${sessionId}/mark-read`);
      } catch (error) {
        // Error marking session as read
      }

      // Then delete the session
      await clientApi.delete(`/api/chat/${sessionId}/reject`);

      // Refresh the sessions list
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Failed to reject chat request');

      // Refresh the sessions list to remove expired/invalid requests
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    }
  };

  const handleEndChat = async (sessionId: number) => {
    if (!confirm('Are you sure you want to end this chat?')) return;

    try {
      const { clientApi } = await import('@/lib/api');
      await clientApi.put(`/api/chat/${sessionId}/end`);

      // Refresh the sessions list
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    } catch (error: any) {
      showNotification('error', error.response?.data?.error || 'Failed to end chat');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-semibold">
            Active
          </span>
        );
      case 'waiting':
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-full font-semibold">
            Pending
          </span>
        );
      case 'ended':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-semibold">
            Ended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="private-chats" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4 border-aegean-600">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">Private Chats</h1>
          <p className="text-gray-600 mb-8">
            Manage your one-on-one private conversations
          </p>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading your private chats...</div>
            </div>
          ) : sessions.filter((session) => session.status === 'waiting' || session.status === 'active').length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Private Chats Yet</h2>
              <p className="text-gray-500">
                Start a conversation by sending a chat request to another user
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.filter((session) => session.status === 'waiting' || session.status === 'active').map((session) => {
                const isUser1 = session.user1_session_token === mySessionToken;
                const partnerUsername = isUser1 ? session.user2_username : session.user1_username;
                const partnerSessionToken = isUser1 ? session.user2_session_token : session.user1_session_token;

                return (
                  <div
                    key={session.id}
                    onClick={() => openChat(session.id)}
                    className="border-2 border-gray-200 rounded-lg p-6 hover:border-aegean-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <UserActionMenu
                            username={partnerUsername}
                            userSessionToken={partnerSessionToken}
                            currentUserSessionToken={mySessionToken}
                            accentColor="#4D89B0"
                            className="text-lg font-semibold"
                            style={{ color: '#4D89B0' }}
                          />
                          {getStatusBadge(session.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Started {new Date(session.created_at).toLocaleDateString()} at{' '}
                          {new Date(session.created_at).toLocaleTimeString()}
                        </p>
                        {session.ended_at && (
                          <p className="text-sm text-gray-500">
                            Ended {new Date(session.ended_at).toLocaleDateString()} at{' '}
                            {new Date(session.ended_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                      <div>
                        {session.status === 'active' && (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openChatAsFloater(session);
                                }}
                                className="px-6 py-2 bg-aegean-600 text-white rounded-lg hover:bg-aegean-700 transition font-semibold"
                              >
                                {plannedChats.find((chat) => chat.id === session.id) ? 'Close Chat Window' : 'Open Chat Window'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEndChat(session.id);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                              >
                                End Chat
                              </button>
                            </div>
                            {(() => {
                              const timeRemaining = getTimeRemaining(session.created_at);
                              return (
                                <div className={`text-xs font-semibold ${timeRemaining <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                                  Inactivity timeout: {formatTime(timeRemaining)}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {session.status === 'waiting' && (
                          <div>
                            {isUser1 ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-sm text-gray-500 italic">
                                  Waiting for acceptance
                                </div>
                                {(() => {
                                  const timeRemaining = getTimeRemaining(session.created_at);
                                  return (
                                    <div className={`text-xs font-semibold ${timeRemaining <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                                      Expires in {formatTime(timeRemaining)}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptRequest(session.id);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectRequest(session.id);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                                  >
                                    Reject
                                  </button>
                                </div>
                                {(() => {
                                  const timeRemaining = getTimeRemaining(session.created_at);
                                  return (
                                    <div className={`text-xs font-semibold ${timeRemaining <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                                      Expires in {formatTime(timeRemaining)}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                        {session.status === 'ended' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChatAsFloater(session);
                            }}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                          >
                            {plannedChats.find((chat) => chat.id === session.id) ? 'Close Chat Window' : 'Open Chat Window'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
