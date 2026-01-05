import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { createChatroom, updateChatroom, deleteChatroom } from '@/lib/services/chatrooms';

interface Chatroom {
  id: number;
  name: string;
  description: string;
  created_at: string;
  creator_discriminator: string | null;
  is_my_chatroom: boolean;
}

interface ChatroomsPageProps {
  chatrooms: Chatroom[];
  userSessionToken: string | null;
  currentPage: number;
  totalPages: number;
  error?: string;
}

export default function ChatroomsPage({ chatrooms, userSessionToken, currentPage, totalPages, error }: ChatroomsPageProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChatroom, setEditingChatroom] = useState<Chatroom | null>(null);
  const [chatroomName, setChatroomName] = useState('');
  const [chatroomDescription, setChatroomDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chatroomName.trim() || !chatroomDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createChatroom({
        name: chatroomName.trim(),
        description: chatroomDescription.trim(),
      });

      // Reset form and close modal
      setChatroomName('');
      setChatroomDescription('');
      setIsModalOpen(false);

      // Refresh the page to show the new chatroom
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error creating chatroom:', err);
      setFormError('Failed to create chatroom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (chatroom: Chatroom) => {
    setEditingChatroom(chatroom);
    setChatroomName(chatroom.name);
    setChatroomDescription(chatroom.description || '');
    setIsEditModalOpen(true);
    setFormError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingChatroom || !chatroomName.trim() || !chatroomDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await updateChatroom(editingChatroom.id, {
        name: chatroomName.trim(),
        description: chatroomDescription.trim(),
      });

      // Reset form and close modal
      setChatroomName('');
      setChatroomDescription('');
      setEditingChatroom(null);
      setIsEditModalOpen(false);

      // Refresh the page to show the updated chatroom
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error updating chatroom:', err);
      setFormError('Failed to update chatroom. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (chatroom: Chatroom) => {
    if (!confirm(`Are you sure you want to delete "${chatroom.name}"? All messages in this chatroom will also be deleted.`)) {
      return;
    }

    try {
      await deleteChatroom(chatroom.id);
      // Refresh the page to show the updated list
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error deleting chatroom:', err);
      alert('Failed to delete chatroom. Please try again.');
    }
  };

  const handleSearch = (query: string) => {
    if (query) {
      router.push(`/chatrooms?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/chatrooms');
    }
  };

  const handleClearSearch = () => {
    router.push('/chatrooms');
  };

  const handlePageChange = (page: number) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page },
    });
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="chatrooms" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">Error loading chatrooms: {error}</p>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Chatrooms</h1>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-white rounded-lg transition font-semibold"
                style={{ backgroundColor: '#4D89B0' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
              >
                Create Chatroom
              </button>
            </div>

            {/* Search Bar */}
            <SearchBar
              initialQuery={(router.query.q as string) || ''}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              placeholder="Search chatrooms..."
              color="#4D89B0"
            />

            {/* Chatrooms List */}
            <div className="space-y-4">
              {chatrooms.map((chatroom) => (
                <div
                  key={chatroom.id}
                  className="block bg-white p-6 rounded-lg border-2 hover:shadow-lg transition relative"
                  style={{ borderColor: '#4D89B0' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/chatrooms/${chatroom.id}`} className="flex-1">
                      <div>
                        <h2 className="text-xl font-semibold mb-2 text-gray-800">{chatroom.name}</h2>
                        <p className="text-gray-600">{chatroom.description}</p>
                      </div>
                    </Link>

                    {/* Show Edit and Delete buttons only for current user's chatrooms */}
                    {chatroom.is_my_chatroom && (
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleStartEdit(chatroom);
                          }}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: '#4D89B0' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(chatroom);
                          }}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date at bottom right */}
                  <div className="flex justify-end mt-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(chatroom.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {chatrooms.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No chatrooms yet. Create the first one!</p>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              color="#4D89B0"
            />
          </div>
        )}

        {/* Create Chatroom Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#4D89B0' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Create Chatroom</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError('');
                    setChatroomName('');
                    setChatroomDescription('');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
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
                    maxLength={20}
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
                    maxLength={200}
                    rows={4}
                    disabled={isSubmitting}
                    className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
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
                    {isSubmitting ? 'Creating...' : 'Create Chatroom'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Chatroom Modal */}
        {isEditModalOpen && editingChatroom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#4D89B0' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Edit Chatroom</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingChatroom(null);
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
                    maxLength={20}
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
                    maxLength={200}
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
                      setEditingChatroom(null);
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
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const page = parseInt(context.query.page as string) || 1;
  const searchQuery = context.query.q as string;
  const limit = 20; // Default limit

  try {
    // Use SERVER_API_URL for SSR (direct backend access in container)
    // Falls back to NEXT_PUBLIC_API_URL for local dev
    const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Determine which endpoint to call based on search query
    const chatroomsEndpoint = searchQuery 
      ? API_ENDPOINTS.searchChatrooms(searchQuery, page, limit)
      : API_ENDPOINTS.getChatrooms(page, limit);

    // Fetch user session and chatrooms
    const [userResponse, chatroomsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(chatroomsEndpoint, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    if (!chatroomsResponse.ok) {
      throw new Error(`API responded with status: ${chatroomsResponse.status}`);
    }

    const data = await chatroomsResponse.json();

    // Handle different response formats
    const chatrooms = Array.isArray(data) ? data : (data.chatrooms || []);
    const total = data.totalChatrooms || data.totalPosts || data.total || chatrooms.length;
    const totalPages = data.totalPages || Math.ceil(total / limit);

    // Get user's session token (if authenticated)
    let userSessionToken = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userSessionToken = userData.user?.session_token || null;
    }

    return {
      props: {
        chatrooms,
        userSessionToken,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching chatrooms:', error);
    return {
      props: {
        chatrooms: [],
        userSessionToken: null,
        currentPage: 1,
        totalPages: 1,
        error: error instanceof Error ? error.message : 'Failed to load chatrooms',
      },
    };
  }
};
