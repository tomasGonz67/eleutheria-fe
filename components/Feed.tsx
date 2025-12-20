import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createPost, updatePost, deletePost } from '@/lib/services/posts';
import Pagination from './Pagination';
import SearchBar from './SearchBar';

interface Post {
  id: number;
  content: string;
  username: string;
  author_session_token: string;
  created_at: string;
  comment_count?: number;
}

interface FeedProps {
  title?: string;
  description?: string;
  backLink?: {
    href: string;
    label: string;
  };
  posts: Post[];
  forumId?: number;
  username?: string;
  userSessionToken?: string | null;
  showForumActions?: boolean;
  onEditForum?: () => void;
  onDeleteForum?: () => void;
  currentPage?: number;
  totalPages?: number;
  searchQuery?: string;
}

export default function Feed({ title = 'Global Feed', description, backLink, posts, forumId = 1, username = 'Anonymous', userSessionToken = null, showForumActions = false, onEditForum, onDeleteForum, currentPage = 1, totalPages = 1, searchQuery: initialSearchQuery = '' }: FeedProps) {
  const router = useRouter();
  const [postContent, setPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postContent.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await createPost(forumId, { content: postContent });
      setPostContent('');
      // Refresh the page to show the new post
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (postId: number) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await updatePost(forumId, postId, { content: editContent.trim() });
      setEditingPostId(null);
      setEditContent('');
      // Refresh the page to show the updated post
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error updating post:', err);
      setError('Failed to update post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await deletePost(forumId, postId);
      // Refresh the page to show the deleted post is gone
      router.replace(router.asPath);
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    // If on /feed, navigate to /forums/1 instead
    const basePath = router.asPath.split('?')[0] === '/feed' 
      ? `/forums/${forumId}` 
      : router.asPath.split('?')[0];
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    router.push(`${basePath}?${params.toString()}`);
  };

  const handleSearch = (query: string) => {
    // If on /feed, navigate to /forums/1 instead
    const basePath = router.asPath.split('?')[0] === '/feed' 
      ? `/forums/${forumId}` 
      : router.asPath.split('?')[0];
    if (query) {
      router.push(`${basePath}?q=${encodeURIComponent(query)}&page=1`);
    } else {
      router.push(basePath);
    }
  };

  const handleClearSearch = () => {
    // If on /feed, navigate to /forums/1 instead
    const basePath = router.asPath.split('?')[0] === '/feed' 
      ? `/forums/${forumId}` 
      : router.asPath.split('?')[0];
    router.push(basePath);
  };

  return (
    <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
      {backLink && (
        <Link href={backLink.href} className="text-sm mb-4 inline-block hover:underline" style={{ color: '#AA633F' }}>
          ← {backLink.label}
        </Link>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">{title}</h1>
          {description && (
            <p className="text-gray-600 mb-4">{description}</p>
          )}
        </div>
        {/* Show Edit and Delete buttons only for current user's forum */}
        {showForumActions && onEditForum && onDeleteForum && (
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={onEditForum}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#AA633F' }}
            >
              Edit
            </button>
            <button
              onClick={onDeleteForum}
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {!description && <div className="mb-2" />}
      
      {/* Search Bar */}
      <SearchBar
        initialQuery={initialSearchQuery}
        onSearch={handleSearch}
        onClear={handleClearSearch}
        placeholder="Search posts in this forum..."
        color="#AA633F"
      />
      
      <div className="border border-black">
        {/* Create Post Section */}
        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-6 border-b border-black">
          <div className="mb-3">
            <span className="text-sm text-gray-600">Posting as: </span>
            <span className="font-semibold text-gray-800">{username}</span>
          </div>
          {error && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
            rows={3}
            maxLength={300}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={isSubmitting || !postContent.trim()}
              className="px-6 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              style={{ backgroundColor: isSubmitting || !postContent.trim() ? '#9ca3af' : '#AA633F' }}
              onMouseEnter={(e) => {
                if (!isSubmitting && postContent.trim()) {
                  e.currentTarget.style.backgroundColor = '#8a4f32';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && postContent.trim()) {
                  e.currentTarget.style.backgroundColor = '#AA633F';
                }
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Posts */}
        <div>
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`px-6 py-6 ${index !== posts.length - 1 ? 'border-b border-black' : ''}`}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800 px-3 py-1 bg-gray-100 rounded-md">{post.username}</span>
                <span className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Post Content - Show textarea if editing, otherwise show text */}
              {editingPostId === post.id ? (
                <div className="mb-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
                    rows={3}
                    maxLength={300}
                    disabled={isSubmitting}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSaveEdit(post.id)}
                      disabled={isSubmitting || !editContent.trim()}
                      className="px-4 py-1 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      style={{ backgroundColor: isSubmitting || !editContent.trim() ? '#9ca3af' : '#AA633F' }}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="px-4 py-1 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg">{post.content}</p>
              )}

              {/* Post Actions */}
              {editingPostId !== post.id && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      router.push({
                        pathname: `/forums/${forumId}/comments/${post.id}`,
                        query: {
                          post_content: post.content,
                          post_username: post.username,
                        }
                      });
                    }}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: '#AA633F' }}
                  >
                    View Comments {post.comment_count !== undefined && `(${post.comment_count})`}
                  </button>
                  {/* Show Edit and Delete buttons only for current user's posts */}
                  {userSessionToken && post.author_session_token === userSessionToken && (
                    <>
                      <p className="text-gray-500">|</p>
                      <button
                        onClick={() => handleStartEdit(post)}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: '#AA633F' }}
                      >
                        Edit
                      </button>
                      <p className="text-gray-500">|</p>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-sm font-semibold hover:underline text-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet. Be the first to post!</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        color="#AA633F"
      />
    </div>
  );
}
