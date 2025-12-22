import { useState } from 'react';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { createPost, updatePost, deletePost } from '@/lib/services/posts';
import { clientApi } from '@/lib/api';
import UserActionMenu from '@/components/UserActionMenu';

interface Post {
  id: number;
  content: string;
  username: string;
  author_session_token: string;
  created_at: string;
  parent_id: number | null;
  comment_count?: number;
}

interface Forum {
  id: number;
  name: string;
  description: string;
}

interface PostCommentsPageProps {
  forum: Forum;
  postId: number;
  comments: Post[];
  username: string;
  userSessionToken: string | null;
  postContent?: string;
  postUsername?: string;
  error?: string;
}

interface CommentsState {
  topLevelComments: Post[];
}

// Recursive Comment Component
interface CommentItemProps {
  comment: Post;
  depth: number;
  username: string;
  userSessionToken: string | null;
  forumId: number;
  isSubmitting: boolean;
  editingCommentId: number | null;
  editContent: string;
  replyingToCommentId: number | null;
  commentReplyContent: string;
  expandedComments: Set<number>;
  loadedReplies: Map<number, Post[]>;
  loadingReplies: Set<number>;
  parentUsername?: string;
  parentSessionToken?: string;
  onStartEdit: (comment: Post) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onStartReply: (commentId: number) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: number) => void;
  onToggleReplies: (commentId: number) => void;
  setEditContent: (content: string) => void;
  setCommentReplyContent: (content: string) => void;
}

function CommentItem({
  comment,
  depth,
  username,
  userSessionToken,
  forumId,
  isSubmitting,
  editingCommentId,
  editContent,
  replyingToCommentId,
  commentReplyContent,
  expandedComments,
  loadedReplies,
  loadingReplies,
  parentUsername,
  parentSessionToken,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onToggleReplies,
  setEditContent,
  setCommentReplyContent,
}: CommentItemProps) {
  // Background color gets lighter with depth
  const getBackgroundColor = (depth: number) => {
    if (depth === 0) return 'bg-white';
    if (depth === 1) return 'bg-gray-50';
    if (depth === 2) return 'bg-gray-100';
    return 'bg-gray-200';
  };

  const isExpanded = expandedComments.has(comment.id);
  const replies = loadedReplies.get(comment.id) || [];
  const isLoading = loadingReplies.has(comment.id);

  return (
    <div className={`${depth > 0 ? 'ml-6 mt-2' : ''}`}>
      <div className={`border border-gray-300 rounded-lg p-4 ${getBackgroundColor(depth)}`}>
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 px-3 py-1 bg-gray-200 rounded-md">
              <UserActionMenu
                username={comment.username}
                userSessionToken={comment.author_session_token}
                currentUserSessionToken={userSessionToken}
                accentColor="#AA633F"
                className="font-semibold text-gray-800"
              />
            </span>
            {parentUsername && (
              <>
                <span className="text-sm text-gray-500">Reply to →</span>
                <span className="text-sm font-semibold text-gray-700">
                  <UserActionMenu
                    username={parentUsername}
                    userSessionToken={parentSessionToken}
                    currentUserSessionToken={userSessionToken}
                    accentColor="#AA633F"
                    className="text-sm font-semibold text-gray-700"
                  />
                </span>
              </>
            )}
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Comment Content - Show textarea if editing, otherwise show text */}
        {editingCommentId === comment.id ? (
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
                onClick={() => onSaveEdit(comment.id)}
                disabled={isSubmitting || !editContent.trim()}
                className="px-4 py-1 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                style={{ backgroundColor: isSubmitting || !editContent.trim() ? '#9ca3af' : '#AA633F' }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={isSubmitting}
                className="px-4 py-1 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 mb-4 p-3 bg-white rounded-lg">{comment.content}</p>
        )}

        {/* Comment Actions */}
        {editingCommentId !== comment.id && (
          <div className="flex gap-3 items-center">
            <button
              onClick={() => onToggleReplies(comment.id)}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#AA633F' }}
              disabled={isLoading}
            >
              {isLoading 
                ? 'Loading...' 
                : isExpanded 
                  ? 'Hide Comments (-)'
                  : `See Replies${comment.comment_count !== undefined ? ` (${comment.comment_count})` : ''}`
              }
            </button>
            <p className="text-gray-500">|</p>
            <button
              onClick={() => onStartReply(comment.id)}
              className="text-sm font-semibold hover:underline"
              style={{ color: '#AA633F' }}
            >
              Reply
            </button>
            {/* Show Edit and Delete buttons only for current user's comments */}
            {userSessionToken && comment.author_session_token === userSessionToken && (
              <>
                <p className="text-gray-500">|</p>
                <button
                  onClick={() => onStartEdit(comment)}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: '#AA633F' }}
                >
                  Edit
                </button>
                <p className="text-gray-500">|</p>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-sm font-semibold hover:underline text-red-600"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply Form */}
        {replyingToCommentId === comment.id && (
          <div className="mt-4 pl-6 border-l-4" style={{ borderColor: '#AA633F' }}>
            <div className="mb-2">
              <span className="text-sm text-gray-600">Replying to {comment.username} as: </span>
              <span className="text-sm font-semibold text-gray-800">{username}</span>
            </div>
            <textarea
              value={commentReplyContent}
              onChange={(e) => setCommentReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
              rows={3}
              maxLength={300}
              disabled={isSubmitting}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onSubmitReply(comment.id)}
                disabled={isSubmitting || !commentReplyContent.trim()}
                className="px-4 py-1 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                style={{ backgroundColor: isSubmitting || !commentReplyContent.trim() ? '#9ca3af' : '#AA633F' }}
              >
                {isSubmitting ? 'Replying...' : 'Post Reply'}
              </button>
              <button
                onClick={onCancelReply}
                disabled={isSubmitting}
                className="px-4 py-1 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recursively render nested replies if expanded */}
      {isExpanded && replies.length > 0 && (
        <div>
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              username={username}
              userSessionToken={userSessionToken}
              forumId={forumId}
              isSubmitting={isSubmitting}
              editingCommentId={editingCommentId}
              editContent={editContent}
              replyingToCommentId={replyingToCommentId}
              commentReplyContent={commentReplyContent}
              expandedComments={expandedComments}
              loadedReplies={loadedReplies}
              loadingReplies={loadingReplies}
              parentUsername={comment.username}
              parentSessionToken={comment.author_session_token}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onToggleReplies={onToggleReplies}
              setEditContent={setEditContent}
              setCommentReplyContent={setCommentReplyContent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCommentsPage({ forum, postId, comments: initialComments, username, userSessionToken, postContent, postUsername, error }: PostCommentsPageProps) {
  const router = useRouter();
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [commentReplyContent, setCommentReplyContent] = useState('');
  
  // State for comments and lazy-loaded nested replies
  const [comments, setComments] = useState<Post[]>(initialComments);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [loadedReplies, setLoadedReplies] = useState<Map<number, Post[]>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set());

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await createPost(forum.id, { 
        content: replyContent.trim(),
        parent_id: postId 
      });
      
      setReplyContent('');
      
      // Re-fetch top-level comments to show the new reply without losing expanded state
      const commentsResponse = await clientApi.get(`/api/forums/${forum.id}/posts?parent_id=${postId}`);
      const updatedComments = Array.isArray(commentsResponse.data) ? commentsResponse.data : (commentsResponse.data.posts || []);
      
      // Sort by most recent first
      updatedComments.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setComments(updatedComments);
    } catch (err) {
      console.error('Error creating reply:', err);
      setFormError('Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: Post) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await updatePost(forum.id, commentId, { content: editContent.trim() });
      
      // Update the comment in state
      const updateCommentInList = (commentsList: Post[]): Post[] => {
        return commentsList.map(c => 
          c.id === commentId ? { ...c, content: editContent.trim() } : c
        );
      };
      
      setComments(updateCommentInList(comments));
      
      // Also update in loaded replies if it exists there
      setLoadedReplies(prev => {
        const newMap = new Map(prev);
        newMap.forEach((replies, parentId) => {
          newMap.set(parentId, updateCommentInList(replies));
        });
        return newMap;
      });
      
      setEditingCommentId(null);
      setEditContent('');
    } catch (err) {
      console.error('Error updating comment:', err);
      setFormError('Failed to update comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    // Find the deleted comment's parent_id to update its count
    let deletedCommentParentId: number | null = null;
    const findComment = (commentsList: Post[]): Post | undefined => {
      return commentsList.find(c => c.id === commentId);
    };
    
    const deletedComment = findComment(comments);
    if (deletedComment) {
      deletedCommentParentId = deletedComment.parent_id;
    } else {
      // Search in loaded replies
      loadedReplies.forEach((replies) => {
        const found = findComment(replies);
        if (found) deletedCommentParentId = found.parent_id;
      });
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await deletePost(forum.id, commentId);
      
      // Remove the comment from state
      const filterComments = (commentsList: Post[]): Post[] => {
        return commentsList.filter(c => c.id !== commentId);
      };
      
      setComments(filterComments(comments));
      
      // Also remove from loaded replies if it exists there
      setLoadedReplies(prev => {
        const newMap = new Map(prev);
        newMap.forEach((replies, parentId) => {
          newMap.set(parentId, filterComments(replies));
        });
        return newMap;
      });
      
      // Decrement comment_count for the parent comment
      if (deletedCommentParentId) {
        const decrementCount = (commentsList: Post[]): Post[] => {
          return commentsList.map(c => 
            c.id === deletedCommentParentId 
              ? { ...c, comment_count: Math.max((c.comment_count || 0) - 1, 0) } 
              : c
          );
        };
        
        setComments(decrementCount(comments));
        
        setLoadedReplies(prev => {
          const newMap = new Map(prev);
          newMap.forEach((replies, parentId) => {
            newMap.set(parentId, decrementCount(replies));
          });
          return newMap;
        });
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      setFormError('Failed to delete comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartReplyToComment = (commentId: number) => {
    setReplyingToCommentId(commentId);
    setCommentReplyContent('');
  };

  const handleCancelReplyToComment = () => {
    setReplyingToCommentId(null);
    setCommentReplyContent('');
  };

  const handleSubmitReplyToComment = async (parentCommentId: number) => {
    if (!commentReplyContent.trim()) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await createPost(forum.id, { 
        content: commentReplyContent.trim(),
        parent_id: parentCommentId 
      });
      
      // Always re-fetch replies and auto-expand to show the new reply
      const repliesResponse = await clientApi.get(`/api/forums/${forum.id}/posts?parent_id=${parentCommentId}`);
      const replies = Array.isArray(repliesResponse.data) ? repliesResponse.data : (repliesResponse.data.posts || []);
      
      // Sort by most recent first
      replies.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Update loaded replies and expand the comment to show new reply
      setLoadedReplies(prev => new Map(prev).set(parentCommentId, replies));
      setExpandedComments(prev => new Set(prev).add(parentCommentId));
      
      // Update comment_count for the parent comment
      const updateCommentCount = (commentsList: Post[]): Post[] => {
        return commentsList.map(c => 
          c.id === parentCommentId 
            ? { ...c, comment_count: (c.comment_count || 0) + 1 } 
            : c
        );
      };
      
      setComments(updateCommentCount(comments));
      
      // Also update in loaded replies if it exists there
      setLoadedReplies(prev => {
        const newMap = new Map(prev);
        newMap.forEach((replies, parentId) => {
          newMap.set(parentId, updateCommentCount(replies));
        });
        return newMap;
      });
      
      setReplyingToCommentId(null);
      setCommentReplyContent('');
    } catch (err) {
      console.error('Error creating reply:', err);
      setFormError('Failed to post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch nested replies for a comment (lazy loading)
  const fetchReplies = async (commentId: number) => {
    console.log('🔍 Fetching replies for comment:', commentId);
    setLoadingReplies(prev => new Set(prev).add(commentId));
    
    try {
      const response = await clientApi.get(`/api/forums/${forum.id}/posts?parent_id=${commentId}`);
      const replies = Array.isArray(response.data) ? response.data : (response.data.posts || []);
      
      // Sort replies by most recent first
      replies.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('✅ Loaded replies for comment', commentId, ':', replies.length, 'replies');
      
      // Store replies in state
      setLoadedReplies(prev => new Map(prev).set(commentId, replies));
      setExpandedComments(prev => new Set(prev).add(commentId));
    } catch (err) {
      console.error('❌ Error loading replies for comment', commentId, ':', err);
      setFormError('Failed to load replies.');
    } finally {
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  // Recursively collapse all descendants when hiding replies
  const collapseAllDescendants = (commentId: number) => {
    const replies = loadedReplies.get(commentId) || [];
    
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.delete(commentId);
      
      // Recursively collapse all child comments
      replies.forEach(reply => {
        collapseDescendantsRecursive(reply.id, next);
      });
      
      return next;
    });
  };
  
  const collapseDescendantsRecursive = (commentId: number, expandedSet: Set<number>) => {
    expandedSet.delete(commentId);
    const replies = loadedReplies.get(commentId) || [];
    replies.forEach(reply => {
      collapseDescendantsRecursive(reply.id, expandedSet);
    });
  };

  // Toggle expand/collapse of nested replies
  const toggleReplies = (commentId: number) => {
    if (expandedComments.has(commentId)) {
      // Collapse - also collapse all descendants
      collapseAllDescendants(commentId);
    } else {
      // Expand - fetch if not already loaded
      if (!loadedReplies.has(commentId)) {
        fetchReplies(commentId);
      } else {
        setExpandedComments(prev => new Set(prev).add(commentId));
      }
    }
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">Error loading post: {error}</p>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#AA633F' }}>
            <Link href={`/forums/${forum.id}`} className="text-sm mb-4 inline-block hover:underline" style={{ color: '#AA633F' }}>
              ← Back to {forum.name}
            </Link>

            {postContent && postUsername ? (
              <div className="mb-6">
                <h1 className="text-xl font-bold mb-3 text-gray-800">
                  Comments for post
                </h1>
                <div className="p-4 bg-gray-100 rounded-lg border border-gray-300 mb-2">
                  <p className="text-gray-700">{postContent}</p>
                </div>
                <p className="text-sm text-gray-600">
                  by <UserActionMenu
                    username={postUsername}
                    accentColor="#AA633F"
                    className="text-sm text-gray-600"
                  />
                </p>
              </div>
            ) : (
              <h1 className="text-2xl font-bold mb-4 text-gray-800">Comments for Post #{postId}</h1>
            )}

            {/* Reply Form */}
            <div className="border border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Add a Reply</h2>
              <form onSubmit={handleReplySubmit}>
                <div className="mb-3">
                  <span className="text-sm text-gray-600">Posting as: </span>
                  <span className="font-semibold text-gray-800">{username}</span>
                </div>
                {formError && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                    {formError}
                  </div>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
                  rows={3}
                  maxLength={300}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyContent.trim()}
                    className="px-6 py-2 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isSubmitting || !replyContent.trim() ? '#9ca3af' : '#AA633F' }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting && replyContent.trim()) {
                        e.currentTarget.style.backgroundColor = '#8a4f32';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting && replyContent.trim()) {
                        e.currentTarget.style.backgroundColor = '#AA633F';
                      }
                    }}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments List */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">
                Direct Replies ({comments.length})
              </h2>

              {comments.length === 0 ? (
                <div className="text-center py-12 border border-gray-300 rounded-lg">
                  <p className="text-gray-500">No comments yet. Be the first to reply!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      depth={0}
                      username={username}
                      userSessionToken={userSessionToken}
                      forumId={forum.id}
                      isSubmitting={isSubmitting}
                      editingCommentId={editingCommentId}
                      editContent={editContent}
                      replyingToCommentId={replyingToCommentId}
                      commentReplyContent={commentReplyContent}
                      expandedComments={expandedComments}
                      loadedReplies={loadedReplies}
                      loadingReplies={loadingReplies}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                      onSaveEdit={handleSaveEdit}
                      onDelete={handleDelete}
                      onStartReply={handleStartReplyToComment}
                      onCancelReply={handleCancelReplyToComment}
                      onSubmitReply={handleSubmitReplyToComment}
                      onToggleReplies={toggleReplies}
                      setEditContent={setEditContent}
                      setCommentReplyContent={setCommentReplyContent}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id: forumId, postId } = context.params as { id: string; postId: string };
  const postContent = context.query.post_content as string;
  const postUsername = context.query.post_username as string;

  try {
    const API_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_API_URL;

    const commentsUrl = `${API_URL}/api/forums/${forumId}/posts?parent_id=${postId}`;
    
    console.log('Fetching comments from:', commentsUrl);

    // Fetch user and comments (forum metadata should be in comments response)
    const [userResponse, commentsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(commentsUrl, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    // Check each response individually for better error messages
    if (!commentsResponse.ok) {
      console.error('Comments fetch failed:', commentsResponse.status, commentsResponse.statusText);
      throw new Error(`Failed to fetch comments: ${commentsResponse.status}`);
    }

    const commentsData = await commentsResponse.json();
    const comments = Array.isArray(commentsData) ? commentsData : (commentsData.posts || []);
    
    // Sort comments by most recent first
    comments.sort((a: Post, b: Post) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Get forum from comments response (if backend includes it), otherwise use fallback
    const forum = commentsData.forum || { id: parseInt(forumId), name: 'Forum', description: '' };

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
        postId: parseInt(postId),
        comments,
        username,
        userSessionToken,
        postContent: postContent || null,
        postUsername: postUsername || null,
      },
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return {
      props: {
        forum: { id: parseInt(forumId), name: 'Forum', description: '' },
        postId: parseInt(postId),
        comments: [],
        username: 'Anonymous',
        userSessionToken: null,
        postContent: postContent || null,
        postUsername: postUsername || null,
        error: error instanceof Error ? error.message : 'Failed to load post',
      },
    };
  }
};

