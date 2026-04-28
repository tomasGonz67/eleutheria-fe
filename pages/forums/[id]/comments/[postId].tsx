import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Header';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';
import { createPost, updatePost, deletePost } from '@/lib/services/posts';
import { clientApi, getErrorMessage } from '@/lib/api';
import UserActionMenu from '@/components/UserActionMenu';
import { FeedPost, Forum } from '@/lib/types';
import TruncatedText from '@/components/TruncatedText';
import Pagination from '@/components/Pagination';

interface PostCommentsPageProps {
  forum: Forum;
  postId: number;
  comments: FeedPost[];
  username: string;
  userSessionToken: string | null;
  postContent?: string;
  postUsername?: string;
  postDiscriminator?: string;
  postHideDiscriminator?: boolean;
  currentPage: number;
  totalPages: number;
  totalComments: number;
  error?: string;
}

interface CommentsState {
  topLevelComments: FeedPost[];
}

// Recursive Comment Component
interface CommentItemProps {
  comment: FeedPost;
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
  loadedReplies: Map<number, FeedPost[]>;
  loadingReplies: Set<number>;
  highlightCommentId: number | null;
  parentUsername?: string;
  parentDiscriminator?: string;
  parentHideDiscriminator?: boolean;
  onStartEdit: (comment: FeedPost) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onStartReply: (commentId: number) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: number) => void;
  onToggleReplies: (commentId: number) => void;
  onExpandAllReplies: (commentId: number) => void;
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
  highlightCommentId,
  parentUsername,
  parentDiscriminator,
  parentHideDiscriminator,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onToggleReplies,
  onExpandAllReplies,
  setEditContent,
  setCommentReplyContent,
}: CommentItemProps) {
  // Background color gets lighter with depth
  const getBackgroundColor = (depth: number) => {
    if (depth === 0) return 'bg-surface';
    if (depth === 1) return 'bg-surface-secondary';
    if (depth === 2) return 'bg-surface-tertiary';
    return 'bg-surface-elevated';
  };

  const isExpanded = expandedComments.has(comment.id);
  const replies = loadedReplies.get(comment.id) || [];
  const isLoading = loadingReplies.has(comment.id);

  return (
    <div id={`comment-${comment.id}`} className={`${depth > 0 ? 'ml-6 mt-2' : ''}`}>
      <div className={`border border-border rounded-lg p-4 ${getBackgroundColor(depth)}${highlightCommentId === comment.id ? ' comment-highlight' : ''}`}>
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary px-3 py-1 bg-surface-elevated rounded-md">
              <UserActionMenu
                username={comment.username}
                discriminator={comment.author_discriminator}
                hideDiscriminator={comment.author_hide_discriminator}
                isOwnPost={comment.is_my_post}
                accentColor="#AA633F"
                className="font-semibold text-text-primary"
              />
            </span>
            {parentUsername && (
              <>
                <span className="text-sm text-text-muted">Reply to →</span>
                <span className="text-sm font-semibold text-text-secondary">
                  <UserActionMenu
                    username={parentUsername}
                    discriminator={parentDiscriminator}
                    hideDiscriminator={parentHideDiscriminator}
                    accentColor="#AA633F"
                    className="text-sm font-semibold text-text-secondary"
                  />
                </span>
              </>
            )}
          </div>
          <span className="text-sm text-text-muted whitespace-nowrap">
            {new Date(comment.created_at).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>

        {/* Comment Content - Show textarea if editing, otherwise show text */}
        {editingCommentId === comment.id ? (
          <div className="mb-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none resize-none"
              rows={3}
              maxLength={5000}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSaveEdit(comment.id);
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onSaveEdit(comment.id)}
                disabled={isSubmitting || !editContent.trim()}
                className="px-4 py-1 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed text-sm bg-accent-chat hover:bg-accent-chat-hover"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={isSubmitting}
                className="px-4 py-1 border-2 border-border text-text-secondary rounded-lg hover:bg-surface-secondary transition font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <TruncatedText content={comment.content} className="mb-4 p-3 bg-surface rounded-lg" />
        )}

        {/* Comment Actions */}
        {editingCommentId !== comment.id && (
          <div className="flex gap-3 items-center">
            {isLoading ? (
              <span className="text-sm font-semibold text-accent-chat">Loading...</span>
            ) : isExpanded ? (
              <button
                onClick={() => onToggleReplies(comment.id)}
                className="text-sm font-semibold hover:underline text-accent-chat"
              >
                Hide Replies (-)
              </button>
            ) : (
              <>
                <button
                  onClick={() => onToggleReplies(comment.id)}
                  className="text-sm font-semibold hover:underline text-accent-chat"
                >
                  See Direct Replies{comment.comment_count !== undefined && comment.comment_count > 0 ? ` (${comment.comment_count})` : ''}
                </button>
                {comment.comment_count !== undefined && comment.comment_count > 0 && (
                  <>
                    <p className="text-text-muted">|</p>
                    <button
                      onClick={() => onExpandAllReplies(comment.id)}
                      className="text-sm font-semibold hover:underline text-accent-chat"
                    >
                      All Replies
                    </button>
                  </>
                )}
              </>
            )}
            {depth < 7 ? (
              <>
                <p className="text-text-muted">|</p>
                <button
                  onClick={() => onStartReply(comment.id)}
                  className="text-sm font-semibold hover:underline text-accent-chat"
                >
                  Reply
                </button>
              </>
            ) : (
              <>
                <p className="text-text-muted">|</p>
                <span className="text-xs text-text-faint italic">Reply limit reached</span>
              </>
            )}
            {/* Show Edit and Delete buttons only for current user's comments */}
            {comment.is_my_post && (
              <>
                <p className="text-text-muted">|</p>
                <button
                  onClick={() => onStartEdit(comment)}
                  className="text-sm font-semibold hover:underline text-accent-chat"
                >
                  Edit
                </button>
                <p className="text-text-muted">|</p>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-sm font-semibold hover:underline text-error-text"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply Form */}
        {replyingToCommentId === comment.id && (
          <div className="mt-4 pl-6 border-l-4 border-accent-chat">
            <div className="mb-2">
              <span className="text-sm text-text-tertiary">Replying to {comment.username} as: </span>
              <span className="text-sm font-semibold text-text-primary">{username}</span>
            </div>
            <textarea
              value={commentReplyContent}
              onChange={(e) => setCommentReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none resize-none"
              rows={3}
              maxLength={5000}
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmitReply(comment.id);
                }
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onSubmitReply(comment.id)}
                disabled={isSubmitting || !commentReplyContent.trim()}
                className="px-4 py-1 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed text-sm bg-accent-chat hover:bg-accent-chat-hover"
              >
                {isSubmitting ? 'Replying...' : 'Post Reply'}
              </button>
              <button
                onClick={onCancelReply}
                disabled={isSubmitting}
                className="px-4 py-1 border-2 border-border text-text-secondary rounded-lg hover:bg-surface-secondary transition font-semibold text-sm disabled:opacity-50"
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
              highlightCommentId={highlightCommentId}
              parentUsername={comment.username}
              parentDiscriminator={comment.author_discriminator}
              parentHideDiscriminator={comment.author_hide_discriminator}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onDelete={onDelete}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onToggleReplies={onToggleReplies}
              onExpandAllReplies={onExpandAllReplies}
              setEditContent={setEditContent}
              setCommentReplyContent={setCommentReplyContent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCommentsPage({ forum, postId, comments: initialComments, username, userSessionToken, postContent, postUsername, postDiscriminator, postHideDiscriminator, currentPage, totalPages, totalComments, error }: PostCommentsPageProps) {
  const router = useRouter();
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [commentReplyContent, setCommentReplyContent] = useState('');

  // Highlight from notification
  const highlightParam = router.query.highlight;
  const highlightCommentId = highlightParam ? parseInt(highlightParam as string) : null;

  const handlePageChange = (page: number) => {
    const basePath = router.asPath.split('?')[0];
    const params = new URLSearchParams();
    params.set('page', page.toString());
    router.push(`${basePath}?${params.toString()}`);
  };

  // State for comments and lazy-loaded nested replies
  const [comments, setComments] = useState<FeedPost[]>(initialComments);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [loadedReplies, setLoadedReplies] = useState<Map<number, FeedPost[]>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Set<number>>(new Set());
  const [highlightedCommentDeleted, setHighlightedCommentDeleted] = useState(false);

  // Sync comments state when props change (pagination / router.replace)
  useEffect(() => {
    setComments(initialComments);
    setExpandedComments(new Set());
    setLoadedReplies(new Map());
  }, [initialComments]);

  // Auto-expand ancestor chain and scroll to highlighted comment
  useEffect(() => {
    if (!highlightCommentId) return;
    let cancelled = false;

    const expandAndScroll = async () => {
      try {
        // Fetch the ancestor chain for the highlighted comment
        const res = await clientApi.get(`/api/forums/${forum.id}/posts/${highlightCommentId}/ancestors`);
        const ancestors: number[] = res.data.ancestors; // [root, ..., parent, target]

        if (cancelled) return;

        // Remove the root (it's the current page's postId) and the target itself
        // We need to expand everything between root and target
        const toExpand = ancestors.filter((id: number) => id !== postId && id !== highlightCommentId);

        // Sequentially expand each ancestor to load the chain
        for (const ancestorId of toExpand) {
          if (cancelled) return;
          const repliesRes = await clientApi.get(`/api/forums/${forum.id}/posts?parent_id=${ancestorId}`);
          const replies = Array.isArray(repliesRes.data) ? repliesRes.data : (repliesRes.data.posts || []);
          replies.sort((a: FeedPost, b: FeedPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setLoadedReplies(prev => new Map(prev).set(ancestorId, replies));
          setExpandedComments(prev => new Set(prev).add(ancestorId));
          // Small delay to let React render the expanded section
          await new Promise(r => setTimeout(r, 50));
        }

        if (cancelled) return;

        // Wait for render, then scroll to the highlighted comment
        setTimeout(() => {
          const el = document.getElementById(`comment-${highlightCommentId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      } catch (err: any) {
        console.error('Error expanding ancestor chain:', err);
        // 404 from the ancestors endpoint means the highlighted comment was deleted.
        if (err?.response?.status === 404) {
          if (!cancelled) setHighlightedCommentDeleted(true);
          return;
        }
        // Fallback: try scrolling anyway (comment might be a direct reply)
        setTimeout(() => {
          const el = document.getElementById(`comment-${highlightCommentId}`);
          if (!el && !cancelled) {
            setHighlightedCommentDeleted(true);
            return;
          }
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    };

    expandAndScroll();
    return () => { cancelled = true; };
  }, [highlightCommentId, forum.id, postId]);

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

      // Optimistically prepend the new comment (newest first)
      const newComment: FeedPost = {
        id: response.post.id,
        content: replyContent.trim(),
        username,
        author_discriminator: '',
        is_my_post: true,
        created_at: new Date().toISOString(),
        comment_count: 0,
        parent_id: postId,
      };
      setComments(prev => [newComment, ...prev]);
      setReplyContent('');
    } catch (err: any) {
      console.error('Error creating reply:', err);
      setFormError(getErrorMessage(err, 'Failed to post reply. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: FeedPost) => {
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
      const updateCommentInList = (commentsList: FeedPost[]): FeedPost[] => {
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
    } catch (err: any) {
      console.error('Error updating comment:', err);
      setFormError(getErrorMessage(err, 'Failed to update comment. Please try again.'));
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
    const findComment = (commentsList: FeedPost[]): FeedPost | undefined => {
      return commentsList.find(c => c.id === commentId);
    };

    const deletedComment = findComment(comments);
    if (deletedComment) {
      deletedCommentParentId = deletedComment.parent_id ?? null;
    } else {
      // Search in loaded replies
      loadedReplies.forEach((replies) => {
        const found = findComment(replies);
        if (found) deletedCommentParentId = found.parent_id ?? null;
      });
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await deletePost(forum.id, commentId);

      // Remove the comment from state
      const filterComments = (commentsList: FeedPost[]): FeedPost[] => {
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
        const decrementCount = (commentsList: FeedPost[]): FeedPost[] => {
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
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      setFormError(getErrorMessage(err, 'Failed to delete comment. Please try again.'));
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
      replies.sort((a: FeedPost, b: FeedPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Update loaded replies and expand the comment to show new reply
      setLoadedReplies(prev => new Map(prev).set(parentCommentId, replies));
      setExpandedComments(prev => new Set(prev).add(parentCommentId));

      // Update comment_count for the parent comment
      const updateCommentCount = (commentsList: FeedPost[]): FeedPost[] => {
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
    } catch (err: any) {
      console.error('Error creating reply:', err);
      setFormError(getErrorMessage(err, 'Failed to post reply. Please try again.'));
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
      replies.sort((a: FeedPost, b: FeedPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  // Recursively collect all nested replies
  const recursivelyCollectReplies = async (
    commentId: number,
    collected: Map<number, FeedPost[]>,
    expanded: Set<number>
  ) => {
    let replies: FeedPost[];

    // Reuse already-loaded replies if available
    if (loadedReplies.has(commentId)) {
      replies = loadedReplies.get(commentId)!;
    } else {
      const response = await clientApi.get(`/api/forums/${forum.id}/posts?parent_id=${commentId}`);
      replies = Array.isArray(response.data) ? response.data : (response.data.posts || []);
      replies.sort((a: FeedPost, b: FeedPost) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    collected.set(commentId, replies);
    expanded.add(commentId);

    // Recursively fetch children that have replies
    const childrenWithReplies = replies.filter((r: FeedPost) => r.comment_count && r.comment_count > 0);
    await Promise.all(
      childrenWithReplies.map((r: FeedPost) => recursivelyCollectReplies(r.id, collected, expanded))
    );
  };

  // Expand all nested replies recursively
  const expandAllReplies = async (commentId: number) => {
    setLoadingReplies(prev => new Set(prev).add(commentId));

    try {
      const collected = new Map<number, FeedPost[]>();
      const expanded = new Set<number>();

      await recursivelyCollectReplies(commentId, collected, expanded);

      // Batch update state
      setLoadedReplies(prev => {
        const newMap = new Map(prev);
        collected.forEach((replies, id) => newMap.set(id, replies));
        return newMap;
      });
      setExpandedComments(prev => {
        const newSet = new Set(prev);
        expanded.forEach(id => newSet.add(id));
        return newSet;
      });
    } catch (err) {
      console.error('Error expanding all replies:', err);
      setFormError('Failed to load replies.');
    } finally {
      setLoadingReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-marble-100">
      <Head>
        <title>{forum.name} - Comments | Eleutheria</title>
      </Head>
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-surface p-8 rounded-lg border-4 border-error">
            <p className="text-error-text">Error loading post: {error}</p>
          </div>
        ) : (
          <div className="bg-surface p-8 rounded-lg border-4 border-accent-chat">
            {highlightedCommentDeleted && (
              <div className="mb-4 p-4 bg-surface-tertiary border border-border-strong rounded-lg flex items-start gap-3">
                <span className="text-xl leading-none">🗑️</span>
                <p className="text-sm text-text-secondary">
                  The comment you were notified about has been deleted. The rest of the thread is shown below.
                </p>
              </div>
            )}
            <Link href={`/forums/${forum.slug || forum.id}`} className="text-sm mb-4 inline-block hover:underline text-accent-chat">
              ← Back to {forum.name}
            </Link>

            {postContent && postUsername ? (
              <div className="mb-6">
                <h1 className="text-xl font-bold mb-3 text-text-primary">
                  Comments for post
                </h1>
                <div className="p-4 bg-surface-tertiary rounded-lg border border-border mb-2">
                  <TruncatedText content={postContent} />
                </div>
                <div className="text-sm text-text-tertiary">
                  by <UserActionMenu
                    username={postUsername}
                    discriminator={postDiscriminator}
                    hideDiscriminator={postHideDiscriminator}
                    accentColor="#AA633F"
                    className="text-sm text-text-tertiary"
                  />
                </div>
              </div>
            ) : (
              <h1 className="text-2xl font-bold mb-4 text-text-primary">Comments for Post #{postId}</h1>
            )}

            {/* Reply Form */}
            <div className="border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 text-text-primary">Add a Reply</h2>
              <form onSubmit={handleReplySubmit}>
                <div className="mb-3">
                  <span className="text-sm text-text-tertiary">Posting as: </span>
                  <span className="font-semibold text-text-primary">{username}</span>
                </div>
                {formError && (
                  <div className="mb-3 p-2 bg-error-bg border border-red-400 text-error-text-strong rounded">
                    {formError}
                  </div>
                )}
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full p-3 border-2 border-border text-text-inverted rounded-lg focus:border-border-strong focus:outline-none resize-none"
                  rows={3}
                  maxLength={5000}
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.closest('form')?.requestSubmit();
                    }
                  }}
                />
                <div className="flex justify-end mt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyContent.trim()}
                    className="px-6 py-2 text-text-on-color rounded-lg transition font-semibold disabled:bg-disabled disabled:cursor-not-allowed bg-accent-chat hover:bg-accent-chat-hover"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments List */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-text-primary">
                Direct Replies ({totalComments})
              </h2>

              {comments.length === 0 ? (
                <div className="text-center py-12 border border-border rounded-lg">
                  <p className="text-text-muted">No comments yet. Be the first to reply!</p>
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
                      highlightCommentId={highlightCommentId}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={handleCancelEdit}
                      onSaveEdit={handleSaveEdit}
                      onDelete={handleDelete}
                      onStartReply={handleStartReplyToComment}
                      onCancelReply={handleCancelReplyToComment}
                      onSubmitReply={handleSubmitReplyToComment}
                      onToggleReplies={toggleReplies}
                      onExpandAllReplies={expandAllReplies}
                      setEditContent={setEditContent}
                      setCommentReplyContent={setCommentReplyContent}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id: forumId, postId } = context.params as { id: string; postId: string };
  const page = parseInt(context.query.page as string) || 1;
  const limit = 20;

  try {
    // Use SERVER_API_URL for SSR (direct backend access in container)
    // Falls back to NEXT_PUBLIC_API_URL for local dev
    const API_URL = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const commentsUrl = `${API_URL}/api/forums/${forumId}/posts?parent_id=${postId}&page=${page}&limit=${limit}`;
    const postUrl = `${API_URL}/api/forums/${forumId}/posts/${postId}`;

    // Fetch user, post data, and comments in parallel
    const [userResponse, postResponse, commentsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(postUrl, {
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

    // If the post itself is gone, send the user to the deleted screen.
    if (postResponse.status === 404) {
      return { redirect: { destination: '/deleted?type=post', permanent: false } };
    }

    // Check each response individually for better error messages
    if (!commentsResponse.ok) {
      // 404 on the comments endpoint typically means the forum no longer exists.
      if (commentsResponse.status === 404) {
        return { redirect: { destination: '/deleted?type=forum', permanent: false } };
      }
      console.error('Comments fetch failed:', commentsResponse.status, commentsResponse.statusText);
      throw new Error(`Failed to fetch comments: ${commentsResponse.status}`);
    }

    const commentsData = await commentsResponse.json();
    const comments = Array.isArray(commentsData) ? commentsData : (commentsData.posts || []);
    const totalPages = commentsData.totalPages || 1;
    const totalComments = commentsData.totalPosts || comments.length;

    // Get forum from comments response (if backend includes it), otherwise use fallback
    const forum = commentsData.forum || { id: parseInt(forumId) || 0, name: 'Forum', slug: forumId, description: '' };

    // Get post content from the API
    let postContent = null;
    let postUsername = null;
    let postDiscriminator = null;
    let postHideDiscriminator = false;
    if (postResponse.ok) {
      const postData = await postResponse.json();
      postContent = postData.post?.content || null;
      postUsername = postData.post?.username || null;
      postDiscriminator = postData.post?.author_discriminator || null;
      postHideDiscriminator = postData.post?.author_hide_discriminator || false;
    }

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
        postContent,
        postUsername,
        postDiscriminator,
        postHideDiscriminator,
        currentPage: page,
        totalPages,
        totalComments,
      },
    };
  } catch (error) {
    console.error('Error fetching post:', error);
    return {
      props: {
        forum: { id: parseInt(forumId) || 0, name: 'Forum', slug: forumId, description: '' },
        postId: parseInt(postId),
        comments: [],
        username: 'Anonymous',
        userSessionToken: null,
        postContent: null,
        postUsername: null,
        postDiscriminator: null,
        postHideDiscriminator: false,
        currentPage: 1,
        totalPages: 1,
        totalComments: 0,
        error: error instanceof Error ? error.message : 'Failed to load post',
      },
    };
  }
};
