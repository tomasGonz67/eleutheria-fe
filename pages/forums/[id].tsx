import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Feed from '@/components/Feed';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { updateForum, deleteForum } from '@/lib/services/forums';

interface Post {
  id: number;
  content: string;
  username: string;
  author_discriminator: string;
  is_my_post: boolean;
  created_at: string;
  comment_count?: number;
}

interface Forum {
  id: number;
  name: string;
  description: string;
  creator_discriminator: string | null;
  is_my_forum: boolean;
}

interface ForumPostsPageProps {
  forum: Forum;
  posts: Post[];
  username: string;
  userSessionToken: string | null;
  currentPage: number;
  totalPages: number;
  searchQuery?: string;
  error?: string;
}

export default function ForumPostsPage({ forum, posts, username, userSessionToken, currentPage, totalPages, searchQuery, error }: ForumPostsPageProps) {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [forumName, setForumName] = useState('');
  const [forumDescription, setForumDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleStartEdit = () => {
    setForumName(forum.name);
    setForumDescription(forum.description || '');
    setIsEditModalOpen(true);
    setFormError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forumName.trim() || !forumDescription.trim()) {
      setFormError('Both name and description are required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await updateForum(forum.id, {
        name: forumName.trim(),
        description: forumDescription.trim(),
      });

      // Reset form and close modal
      setForumName('');
      setForumDescription('');
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

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${forum.name}"? All posts in this forum will also be deleted.`)) {
      return;
    }

    try {
      await deleteForum(forum.id);
      // Redirect to forums list
      router.push('/forums');
    } catch (err) {
      console.error('Error deleting forum:', err);
      alert('Failed to delete forum. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">Error loading forum: {error}</p>
          </div>
        ) : (
          <>
            <Feed
              title={forum.name}
              description={forum.description}
              backLink={{ href: '/forums', label: 'Back to Forums' }}
              posts={posts}
              forumId={forum.id}
              username={username}
              userSessionToken={userSessionToken}
              showForumActions={forum.is_my_forum}
              onEditForum={handleStartEdit}
              onDeleteForum={handleDelete}
              currentPage={currentPage}
              totalPages={totalPages}
              searchQuery={searchQuery}
            />

            {/* Edit Forum Modal */}
            {isEditModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6 border-4" style={{ borderColor: '#AA633F' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Edit Forum</h2>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
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
                        placeholder="e.g., General Discussion"
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
          </>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const page = parseInt(context.query.page as string) || 1;
  const searchQuery = context.query.q as string;
  const limit = 20; // Default limit

  try {
    const API_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_API_URL;

    // Determine which endpoint to call based on search query
    const postsEndpoint = searchQuery
      ? API_ENDPOINTS.searchPosts(parseInt(id), searchQuery, page, limit)
      : API_ENDPOINTS.getPosts(parseInt(id), page, limit);

    // Fetch user and posts (forum metadata should be in posts response)
    const [userResponse, postsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(postsEndpoint, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    if (!postsResponse.ok) {
      throw new Error('Failed to fetch forum data');
    }

    const postsData = await postsResponse.json();

    // DEBUG: Check for discriminators and UUIDs in posts
    console.log('=== FORUM POSTS DATA CHECK ===');
    if (postsData.posts && postsData.posts.length > 0) {
      const firstPost = postsData.posts[0];
      console.log('First post discriminator:', firstPost.author_discriminator);
      console.log('First post has author_session_token?:', 'author_session_token' in firstPost);
      console.log('First post has is_my_post?:', 'is_my_post' in firstPost);
      if ('author_session_token' in firstPost) {
        console.warn('⚠️  WARNING: UUID EXPOSURE - author_session_token found in post!');
      }
    }
    if (postsData.forum) {
      console.log('Forum creator_discriminator:', postsData.forum.creator_discriminator);
      console.log('Forum has creator_session_token?:', 'creator_session_token' in postsData.forum);
      if ('creator_session_token' in postsData.forum) {
        console.warn('⚠️  WARNING: UUID EXPOSURE - creator_session_token found in forum!');
      }
    }
    console.log('==============================');

    // Get forum from posts response (if backend includes it)
    const forum = postsData.forum || { id: parseInt(id), name: 'Forum', description: '', creator_discriminator: null, is_my_forum: false };

    // Handle different response formats
    const posts = Array.isArray(postsData) ? postsData : (postsData.posts || []);
    
    // Use totalPages from backend if available, otherwise calculate it
    const totalPages = postsData.totalPages || Math.ceil((postsData.totalPosts || postsData.total || posts.length) / limit);

    // Get username and session token from user response (if available)
    let username = 'Anonymous';
    let userSessionToken = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      username = userData.user?.username || 'Anonymous';
      userSessionToken = userData.user?.session_token || null;
    }

    return {
      props: {
        forum,
        posts,
        username,
        userSessionToken,
        currentPage: page,
        totalPages,
        searchQuery: searchQuery || null,
      },
    };
  } catch (error) {
    console.error('Error fetching forum:', error);
    return {
      props: {
        forum: { id: parseInt(id), name: 'Forum', description: '', creator_discriminator: null, is_my_forum: false },
        posts: [],
        username: 'Anonymous',
        userSessionToken: null,
        currentPage: 1,
        totalPages: 1,
        searchQuery: null,
        error: error instanceof Error ? error.message : 'Failed to load forum',
      },
    };
  }
};
