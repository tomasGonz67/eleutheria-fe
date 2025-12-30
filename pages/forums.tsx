import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import SearchBar from '@/components/SearchBar';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { createForum, updateForum, deleteForum } from '@/lib/services/forums';

interface Forum {
  id: number;
  name: string;
  description: string;
  created_at: string;
  creator_discriminator: string | null;
  is_my_forum: boolean;
}

interface ForumsPageProps {
  forums: Forum[];
  userSessionToken: string | null;
  currentPage: number;
  totalPages: number;
  error?: string;
}

export default function ForumsPage({ forums, userSessionToken, currentPage, totalPages, error }: ForumsPageProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [forumName, setForumName] = useState('');
  const [forumDescription, setForumDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forumName.trim() || !forumDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createForum({
        name: forumName.trim(),
        description: forumDescription.trim(),
      });

      // Reset form and close modal
      setForumName('');
      setForumDescription('');
      setIsModalOpen(false);

      // Refresh the page to show the new forum
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error creating forum:', err);
      setFormError('Failed to create forum. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (forum: Forum) => {
    setEditingForum(forum);
    setForumName(forum.name);
    setForumDescription(forum.description || '');
    setIsEditModalOpen(true);
    setFormError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingForum || !forumName.trim() || !forumDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await updateForum(editingForum.id, {
        name: forumName.trim(),
        description: forumDescription.trim(),
      });

      // Reset form and close modal
      setForumName('');
      setForumDescription('');
      setEditingForum(null);
      setIsEditModalOpen(false);

      // Refresh the page to show the updated forum
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error updating forum:', err);
      setFormError('Failed to update forum. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (forum: Forum) => {
    if (!confirm(`Are you sure you want to delete "${forum.name}"? All posts in this forum will also be deleted.`)) {
      return;
    }

    try {
      await deleteForum(forum.id);
      // Refresh the page to show the updated list
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error deleting forum:', err);
      alert('Failed to delete forum. Please try again.');
    }
  };

  const handleSearch = (query: string) => {
    if (query) {
      router.push(`/forums?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/forums');
    }
  };

  const handleClearSearch = () => {
    router.push('/forums');
  };

  const handlePageChange = (page: number) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, page },
    });
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">Error loading forums: {error}</p>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Forums</h1>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-white rounded-lg transition font-semibold"
                style={{ backgroundColor: '#AA633F' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8a4f32'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#AA633F'}
              >
                Create Forum
              </button>
            </div>

            {/* Search Bar */}
            <SearchBar
              initialQuery={(router.query.q as string) || ''}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              placeholder="Search forums..."
              color="#AA633F"
            />

            {/* Forums List */}
            <div className="space-y-4">
              {forums.map((forum) => (
                <div
                  key={forum.id}
                  className="block bg-white p-6 rounded-lg border-2 hover:shadow-lg transition relative"
                  style={{ borderColor: '#AA633F' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/forums/${forum.id}`} className="flex-1">
                      <div>
                        <h2 className="text-xl font-semibold mb-2 text-gray-800">{forum.name}</h2>
                        <p className="text-gray-600">{forum.description}</p>
                      </div>
                    </Link>

                    {/* Show Edit and Delete buttons only for current user's forums */}
                    {forum.is_my_forum && (
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleStartEdit(forum);
                          }}
                          className="text-sm font-semibold hover:underline"
                          style={{ color: '#AA633F' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(forum);
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
                      {new Date(forum.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {forums.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No forums yet. Create the first one!</p>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              color="#AA633F"
            />
          </div>
        )}

        {/* Create Forum Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#AA633F' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Create Forum</h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError('');
                    setForumName('');
                    setForumDescription('');
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
                    Forum Name
                  </label>
                  <input
                    type="text"
                    value={forumName}
                    onChange={(e) => setForumName(e.target.value)}
                    placeholder="e.g., Technology Discussion"
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
                    value={forumDescription}
                    onChange={(e) => setForumDescription(e.target.value)}
                    placeholder="e.g., Talk about tech, gadgets, and software"
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
                      setIsModalOpen(false);
                      setFormError('');
                      setForumName('');
                      setForumDescription('');
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !forumName.trim() || !forumDescription.trim()}
                    className="flex-1 px-4 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isSubmitting || !forumName.trim() || !forumDescription.trim() ? '#9ca3af' : '#AA633F' }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && forumName.trim() && forumDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#8a4f32';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && forumName.trim() && forumDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#AA633F';
                      }
                    }}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Forum'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Forum Modal */}
        {isEditModalOpen && editingForum && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#AA633F' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Edit Forum</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingForum(null);
                    setFormError('');
                    setForumName('');
                    setForumDescription('');
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
                    Forum Name
                  </label>
                  <input
                    type="text"
                    value={forumName}
                    onChange={(e) => setForumName(e.target.value)}
                    placeholder="e.g., Technology Discussion"
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
                    value={forumDescription}
                    onChange={(e) => setForumDescription(e.target.value)}
                    placeholder="e.g., Talk about tech, gadgets, and software"
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
                      setEditingForum(null);
                      setFormError('');
                      setForumName('');
                      setForumDescription('');
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !forumName.trim() || !forumDescription.trim()}
                    className="flex-1 px-4 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isSubmitting || !forumName.trim() || !forumDescription.trim() ? '#9ca3af' : '#AA633F' }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && forumName.trim() && forumDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#8a4f32';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && forumName.trim() && forumDescription.trim()) {
                        e.currentTarget.style.backgroundColor = '#AA633F';
                      }
                    }}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Forum'}
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
    const API_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_API_URL;

    // Determine which endpoint to call based on search query
    const forumsEndpoint = searchQuery 
      ? API_ENDPOINTS.searchForums(searchQuery, page, limit)
      : API_ENDPOINTS.getForums(page, limit);

    // Fetch user session and forums
    const [userResponse, forumsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(forumsEndpoint, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    if (!forumsResponse.ok) {
      throw new Error(`API responded with status: ${forumsResponse.status}`);
    }

    const data = await forumsResponse.json();

    // Handle different response formats
    const forums = Array.isArray(data) ? data : (data.forums || []);
    const total = data.totalForums || data.totalPosts || data.total || data.totalCount || data.total_count || forums.length;
    const totalPages = Math.ceil(total / limit);

    // Get user's session token (if authenticated)
    let userSessionToken = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userSessionToken = userData.user?.session_token || null;
    }

    return {
      props: {
        forums,
        userSessionToken,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching forums:', error);
    return {
      props: {
        forums: [],
        userSessionToken: null,
        currentPage: 1,
        totalPages: 1,
        error: error instanceof Error ? error.message : 'Failed to load forums',
      },
    };
  }
};
