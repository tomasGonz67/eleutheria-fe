import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Header';
import Feed from '@/components/Feed';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { updateForum, deleteForum } from '@/lib/services/forums';
import { FeedPost, ForumWithCounts } from '@/lib/types';

interface ForumPostsPageProps {
  forum: ForumWithCounts;
  posts: FeedPost[];
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
      <Head>
        <title>{forum.name} | Eleutheria</title>
      </Head>
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-surface p-8 rounded-lg border-4 border-error">
            <p className="text-error-text">Error loading forum: {error}</p>
          </div>
        ) : (
          <>
            <Feed
              title={forum.name}
              description={forum.description}
              backLink={{ href: '/forums', label: 'Back to Forums' }}
              posts={posts}
              forumId={forum.id}
              forumSlug={forum.slug}
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
                <div className="bg-surface rounded-lg max-w-md w-full p-6 border-4 border-accent-chat">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-text-primary">Edit Forum</h2>
                    <button
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setFormError('');
                        setForumName('');
                        setForumDescription('');
                      }}
                      className="text-text-muted hover:text-text-secondary text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleEditSubmit}>
                    {formError && (
                      <div className="mb-4 p-2 bg-error-bg border border-red-400 text-error-text-strong rounded">
                        {formError}
                      </div>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-text-secondary mb-2">
                        Forum Name
                      </label>
                      <input
                        type="text"
                        value={forumName}
                        onChange={(e) => setForumName(e.target.value)}
                        placeholder="e.g., General Discussion"
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
                        value={forumDescription}
                        onChange={(e) => setForumDescription(e.target.value)}
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
                          setForumName('');
                          setForumDescription('');
                        }}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 border-2 border-border text-text-secondary rounded-lg hover:bg-surface-secondary transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !forumName.trim() || !forumDescription.trim()}
                        className="flex-1 px-4 py-2 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed bg-accent-chat hover:bg-accent-chat-hover"
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
    // Use SERVER_API_URL for SSR (direct backend access in container)
    // Falls back to NEXT_PUBLIC_API_URL for local dev
    const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Determine which endpoint to call based on search query
    // Pass id as-is (supports both numeric IDs and slugs)
    const postsEndpoint = searchQuery
      ? API_ENDPOINTS.searchPosts(id, searchQuery, page, limit)
      : API_ENDPOINTS.getPosts(id, page, limit);

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
      if (postsResponse.status === 404) {
        return { redirect: { destination: '/deleted?type=forum', permanent: false } };
      }
      throw new Error('Failed to fetch forum data');
    }

    const postsData = await postsResponse.json();

    // Get forum from posts response (if backend includes it)
    const forum = postsData.forum || { id: parseInt(id) || 0, name: 'Forum', slug: id, description: '', creator_discriminator: null, is_my_forum: false };

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
        forum: { id: parseInt(id) || 0, name: 'Forum', slug: id, description: '', creator_discriminator: null, is_my_forum: false },
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
