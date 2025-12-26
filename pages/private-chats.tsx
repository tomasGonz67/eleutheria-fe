import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { getAllChatSessions } from '@/lib/services/chat';
import { getCurrentUser } from '@/lib/services/session';
import UserActionMenu from '@/components/UserActionMenu';

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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mySessionToken, setMySessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error('Error fetching private chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      // If not open, add it
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

      // Refresh the sessions list
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    } catch (error) {
      console.error('Error accepting chat request:', error);
      alert('Failed to accept chat request');
    }
  };

  const handleRejectRequest = async (sessionId: number) => {
    try {
      const { clientApi } = await import('@/lib/api');
      await clientApi.delete(`/api/chat/${sessionId}/reject`);

      // Refresh the sessions list
      const { sessions: allSessions } = await getAllChatSessions();
      const plannedSessions = allSessions.filter(
        (session: ChatSession) => session.type === 'planned'
      );
      setSessions(plannedSessions);
    } catch (error) {
      console.error('Error rejecting chat request:', error);
      alert('Failed to reject chat request');
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
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Private Chats Yet</h2>
              <p className="text-gray-500">
                Start a conversation by sending a chat request to another user
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChatAsFloater(session);
                            }}
                            className="px-6 py-2 bg-aegean-600 text-white rounded-lg hover:bg-aegean-700 transition font-semibold"
                          >
                            Open Chat
                          </button>
                        )}
                        {session.status === 'waiting' && (
                          <div>
                            {isUser1 ? (
                              <div className="text-sm text-gray-500 italic">
                                Waiting for acceptance
                              </div>
                            ) : (
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
                            Open Chat
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
