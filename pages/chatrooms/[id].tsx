import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import UserActionMenu from '@/components/UserActionMenu';
import { clientApi, getErrorMessage } from '@/lib/api';
import { createChatroomMessage, updateChatroom, deleteChatroom } from '@/lib/services/chatrooms';
import { useChatStore } from '@/store/chatStore';
import { joinChatroom, leaveChatroom, isSocketConnected, connectSocket } from '@/lib/socket';
import { Message, ChatroomWithUsers } from '@/lib/types';

export default function ChatroomMessagesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatroom, setChatroom] = useState<ChatroomWithUsers | null>(null);
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
    if (!socket || !chatroom) return;

    const chatroomId = chatroom.id;

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
          is_me: data.sender_discriminator === userDiscriminator,
        }]);
      }
    };

    // Listen for active users updates
    const handleUsersUpdated = (data: any) => {
      if (data.chatroom_id === chatroomId) {
        setActiveUsers(data.users || []);
      }
    };

    // Handle reconnection - rejoin chatroom and refresh data
    let hasRegistered = false;
    const handleRegistered = () => {
      if (!hasRegistered) {
        // First time (initial connection) - just mark as registered
        hasRegistered = true;
        return;
      }
      // Subsequent times (reconnection) - reload the page
      console.log('🔄 Socket reconnected, reloading chatroom page...');
      router.reload();
    };

    socket.on('new_chatroom_message', handleNewMessage);
    socket.on('chatroom_users_updated', handleUsersUpdated);
    socket.on('registered', handleRegistered);

    // Cleanup on unmount or when ID changes
    return () => {
      socket.off('new_chatroom_message', handleNewMessage);
      socket.off('chatroom_users_updated', handleUsersUpdated);
      socket.off('registered', handleRegistered);
      leaveChatroom(chatroomId);
    };
  }, [socket, chatroom]);

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

        // Find the specific chatroom by ID or slug
        const chatroomsData = chatroomsResponse.data;
        const chatrooms = Array.isArray(chatroomsData) ? chatroomsData : (chatroomsData.chatrooms || []);
        const isNumeric = /^\d+$/.test(id as string);
        const foundChatroom = chatrooms.find((c: ChatroomWithUsers) =>
          isNumeric ? c.id === Number(id) : (c as any).slug === id
        );

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

    if (!newMessage.trim() || !chatroom) return;

    setIsSending(true);

    try {
      await createChatroomMessage(chatroom.id, { content: newMessage.trim() });
      setNewMessage('');
      // No need to refresh messages - Socket.io will handle it in real-time
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(getErrorMessage(err, 'Failed to send message'));
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
    } catch (err: any) {
      console.error('Error updating chatroom:', err);
      setFormError(getErrorMessage(err, 'Failed to update chatroom. Please try again.'));
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
    } catch (err: any) {
      console.error('Error deleting chatroom:', err);
      alert(getErrorMessage(err, 'Failed to delete chatroom. Please try again.'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-marble-100">
        <Header currentPage="chatrooms" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-surface p-8 rounded-lg border-4 border-accent-forum">
            <p className="text-text-tertiary">Loading messages...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marble-100">
      <Head>
        <title>{chatroom?.name || 'Chatroom'} | Eleutheria</title>
      </Head>
      <Header currentPage="chatrooms" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-surface p-8 rounded-lg border-4 border-error">
            <p className="text-error-text">{error}</p>
          </div>
        ) : (
          <div className="bg-surface p-8 rounded-lg border-4 border-accent-forum">
            <Link href="/chatrooms" className="text-sm mb-4 inline-block hover:underline text-accent-forum">
              ← Back to Chatrooms
            </Link>

            <div className="flex justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1 text-text-primary">
                      {chatroom?.name || 'Chatroom'}
                    </h1>
                    {chatroom?.description && (
                      <p className="text-text-tertiary text-sm mb-2">{chatroom.description}</p>
                    )}
                  </div>
                  {/* Show Edit and Delete buttons only for current user's chatrooms */}
                  {userDiscriminator && chatroom?.creator_discriminator === userDiscriminator && (
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={handleStartEdit}
                        className="text-sm font-semibold hover:underline text-accent-forum"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="text-sm font-semibold text-error-text hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Users Sidebar */}
              <div className="w-64 self-start">
                <div className="border border-border-strong rounded-lg p-4">
                  <h3 className="font-bold text-text-primary mb-3 text-sm">
                    Active Users ({activeUsers.length})
                  </h3>
                  <button
                    onClick={() => setIsActiveUsersModalOpen(true)}
                    className="w-full px-4 py-2 text-sm font-semibold rounded-lg transition bg-accent-forum hover:bg-accent-forum-hover text-text-on-color"
                  >
                    Show all
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="border border-border-strong rounded-lg">
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
            <div className="bg-surface rounded-lg max-w-md w-full p-6 border-4 border-accent-forum">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-text-primary">Edit Chatroom</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setFormError('');
                    setChatroomName('');
                    setChatroomDescription('');
                  }}
                  className="text-text-muted hover:text-text-secondary text-2xl"
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
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Chatroom Name
                  </label>
                  <input
                    type="text"
                    value={chatroomName}
                    onChange={(e) => setChatroomName(e.target.value)}
                    placeholder="e.g., General Chat"
                    maxLength={35}
                    disabled={isSubmitting}
                    className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={chatroomDescription}
                    onChange={(e) => setChatroomDescription(e.target.value)}
                    placeholder="e.g., A place for general discussion"
                    maxLength={500}
                    rows={4}
                    disabled={isSubmitting}
                    className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.closest('form')?.requestSubmit();
                      }
                    }}
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
                    className="flex-1 px-4 py-2 border-2 border-border text-text-secondary rounded-lg hover:bg-surface-secondary transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !chatroomName.trim() || !chatroomDescription.trim()}
                    className="flex-1 px-4 py-2 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed bg-accent-forum hover:bg-accent-forum-hover"
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
            <div className="bg-surface rounded-lg max-w-md w-full p-6 border-4 border-accent-forum">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-text-primary">Active Users ({activeUsers.length})</h2>
                <button
                  onClick={() => setIsActiveUsersModalOpen(false)}
                  className="text-text-muted hover:text-text-secondary text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activeUsers.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-4">No users online</p>
                ) : (
                  activeUsers.map((username, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 hover:bg-surface-secondary rounded"
                    >
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-sm text-text-secondary">{username}</span>
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
