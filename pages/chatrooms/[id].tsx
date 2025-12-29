import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import UserActionMenu from '@/components/UserActionMenu';
import { clientApi } from '@/lib/api';
import { createChatroomMessage, updateChatroom, deleteChatroom } from '@/lib/services/chatrooms';
import { useChatStore } from '@/store/chatStore';
import { joinChatroom, leaveChatroom, isSocketConnected, connectSocket } from '@/lib/socket';

interface Message {
  id: number;
  content: string;
  username: string;
  sender_discriminator: string;
  created_at: string;
}

interface Chatroom {
  id: number;
  name: string;
  description: string;
  creator_discriminator: string | null;
}

export default function ChatroomMessagesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatroom, setChatroom] = useState<Chatroom | null>(null);
  const [userSessionToken, setUserSessionToken] = useState<string | null>(null);
  const [userDiscriminator, setUserDiscriminator] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [chatroomName, setChatroomName] = useState('');
  const [chatroomDescription, setChatroomDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);

  // Get Socket.io from Zustand store
  const { socket, initializeSocket, cleanupSocket } = useChatStore();

  // Socket should already be initialized from home page
  // Just ensure it's connected (in case user navigated directly to URL)
  useEffect(() => {
    if (!socket) {
      initializeSocket();
    }
  }, [socket, initializeSocket]);

  // Join chatroom Socket.io room and listen for messages
  useEffect(() => {
    if (!socket || !id) return;

    const chatroomId = Number(id);

    // Ensure socket is connected before joining chatroom
    const joinChatroomWhenConnected = async () => {
      // If not connected, try to connect
      if (!isSocketConnected()) {
        console.log('Socket not connected, attempting to connect...');
        connectSocket();

        // Wait up to 3 seconds for connection
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let elapsed = 0;

        while (elapsed < maxWaitTime && !isSocketConnected()) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          elapsed += checkInterval;
        }

        // If still not connected after waiting, show error
        if (!isSocketConnected()) {
          setError('Unable to connect. Please refresh the page and try again.');
          return;
        }
      }

      // Join the chatroom
      joinChatroom(chatroomId);
    };

    joinChatroomWhenConnected();

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.chatroom_id === chatroomId) {
        setMessages((prevMessages) => [...prevMessages, {
          id: data.id,
          content: data.content,
          username: data.username,
          sender_discriminator: data.sender_discriminator,
          created_at: data.created_at,
        }]);
      }
    };

    // Listen for active users updates
    const handleUsersUpdated = (data: any) => {
      if (data.chatroom_id === chatroomId) {
        setActiveUsers(data.users || []);
      }
    };

    // Handle reconnection - rejoin chatroom if socket reconnects
    const handleReconnect = () => {
      console.log('🔄 Socket reconnected, rejoining chatroom...');
      joinChatroom(chatroomId);
    };

    socket.on('new_chatroom_message', handleNewMessage);
    socket.on('chatroom_users_updated', handleUsersUpdated);
    socket.on('reconnect', handleReconnect);

    // Cleanup on unmount or when ID changes
    return () => {
      socket.off('new_chatroom_message', handleNewMessage);
      socket.off('chatroom_users_updated', handleUsersUpdated);
      socket.off('reconnect', handleReconnect);
      leaveChatroom(chatroomId);
    };
  }, [socket, id]);

  // Fetch chatroom info and messages on component mount and when ID changes
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Fetch user session, chatrooms, and messages in parallel
        const [userResponse, chatroomsResponse, messagesResponse] = await Promise.all([
          clientApi.get('/api/session/me'),
          clientApi.get('/api/chatrooms'),
          clientApi.get(`/api/chatrooms/${id}/messages`)
        ]);

        // Get user session token and discriminator
        if (userResponse.data?.user?.session_token) {
          setUserSessionToken(userResponse.data.user.session_token);
        }
        if (userResponse.data?.user?.discriminator) {
          setUserDiscriminator(userResponse.data.user.discriminator);
        }

        // Find the specific chatroom by ID
        const chatroomsData = chatroomsResponse.data;
        const chatrooms = Array.isArray(chatroomsData) ? chatroomsData : (chatroomsData.chatrooms || []);
        const foundChatroom = chatrooms.find((c: Chatroom) => c.id === Number(id));

        if (foundChatroom) {
          setChatroom(foundChatroom);
        }

        setMessages(messagesResponse.data.messages || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load chatroom');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !id) return;

    setIsSending(true);

    try {
      await createChatroomMessage(Number(id), { content: newMessage.trim() });
      setNewMessage('');
      // No need to refresh messages - Socket.io will handle it in real-time
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartEdit = () => {
    if (!chatroom) return;
    setChatroomName(chatroom.name);
    setChatroomDescription(chatroom.description || '');
    setIsEditModalOpen(true);
    setFormError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatroom || !chatroomName.trim() || !chatroomDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await updateChatroom(chatroom.id, {
        name: chatroomName.trim(),
        description: chatroomDescription.trim(),
      });

      // Update local state
      setChatroom({
        ...chatroom,
        name: chatroomName.trim(),
        description: chatroomDescription.trim(),
      });

      // Reset form and close modal
      setChatroomName('');
      setChatroomDescription('');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating chatroom:', err);
      setFormError('Failed to update chatroom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!chatroom) return;

    if (!confirm(`Are you sure you want to delete "${chatroom.name}"? All messages in this chatroom will also be deleted.`)) {
      return;
    }

    try {
      await deleteChatroom(chatroom.id);
      // Redirect to chatrooms list
      router.push('/chatrooms');
    } catch (err) {
      console.error('Error deleting chatroom:', err);
      alert('Failed to delete chatroom. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-marble-100">
        <Header currentPage="chatrooms" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="chatrooms" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
            <Link href="/chatrooms" className="text-sm mb-4 inline-block hover:underline" style={{ color: '#4D89B0' }}>
              ← Back to Chatrooms
            </Link>

            <div className="flex justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1 text-gray-800">
                      {chatroom?.name || 'Chatroom'}
                    </h1>
                    {chatroom?.description && (
                      <p className="text-gray-600 text-sm mb-2">{chatroom.description}</p>
                    )}
                  </div>
                  {/* Show Edit and Delete buttons only for current user's chatrooms */}
                  {userSessionToken && chatroom?.creator_session_token === userSessionToken && (
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={handleStartEdit}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: '#4D89B0' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="text-sm font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Users Sidebar */}
              <div className="w-64 self-start">
                <div className="border border-black rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm">
                    Active Users ({activeUsers.length})
                  </h3>
                  <button
                    onClick={() => setIsActiveUsersModalOpen(true)}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg transition"
                    style={{ backgroundColor: '#4D89B0', color: 'white' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
                  >
                    Show all
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="border border-black rounded-lg">
              {/* Messages */}
              <ChatMessageList
                messages={messages}
                currentUserDiscriminator={userDiscriminator}
                currentUserSessionToken={userSessionToken}
                accentColor="#4D89B0"
                autoScroll={autoScroll}
                emptyStateMessage="No messages yet. Start the conversation!"
              />

              {/* Send Message Form */}
              <ChatInput
                value={newMessage}
                onChange={setNewMessage}
                onSubmit={handleSubmit}
                disabled={isSending}
                placeholder={isSending ? 'Sending...' : 'Type a message...'}
                autoScroll={autoScroll}
                onAutoScrollChange={setAutoScroll}
                showAutoScroll={true}
                accentColor="#4D89B0"
              />
            </div>
          </div>
        )}

        {/* Edit Chatroom Modal */}
        {isEditModalOpen && chatroom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#4D89B0' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Edit Chatroom</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setFormError('');
                    setChatroomName('');
                    setChatroomDescription('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                {formError && (
                  <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                    {formError}
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chatroom Name
                  </label>
                  <input
                    type="text"
                    value={chatroomName}
                    onChange={(e) => setChatroomName(e.target.value)}
                    placeholder="e.g., General Chat"
                    maxLength={100}
                    disabled={isSubmitting}
                    className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={chatroomDescription}
                    onChange={(e) => setChatroomDescription(e.target.value)}
                    placeholder="e.g., A place for general discussion"
                    maxLength={500}
                    rows={4}
                    disabled={isSubmitting}
                    className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setFormError('');
                      setChatroomName('');
                      setChatroomDescription('');
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !chatroomName.trim() || !chatroomDescription.trim()}
                    className="flex-1 px-4 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isSubmitting || !chatroomName.trim() || !chatroomDescription.trim() ? '#9ca3af' : '#4D89B0' }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && chatroomName.trim() && chatroomDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#3d6e8f';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && chatroomName.trim() && chatroomDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#4D89B0';
                      }
                    }}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Chatroom'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Active Users Modal */}
        {isActiveUsersModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#4D89B0' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Active Users ({activeUsers.length})</h2>
                <button
                  onClick={() => setIsActiveUsersModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activeUsers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No users online</p>
                ) : (
                  activeUsers.map((username, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">{username}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
