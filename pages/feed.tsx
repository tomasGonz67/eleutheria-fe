import Header from '@/components/Header';
import Feed from '@/components/Feed';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';

interface Post {
  id: number;
  content: string;
  username: string;
  author_session_token: string;
  created_at: string;
  comment_count?: number;
}

interface FeedPageProps {
  posts: Post[];
  username: string;
  userSessionToken: string | null;
  currentPage: number;
  totalPages: number;
  error?: string;
}

export default function FeedPage({ posts, username, userSessionToken, currentPage, totalPages, error }: FeedPageProps) {
  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="feed" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-white p-8 rounded-lg border-4 border-red-500">
            <p className="text-red-600">Error loading posts: {error}</p>
          </div>
        ) : (
          <Feed 
            posts={posts} 
            forumId={1} 
            username={username} 
            userSessionToken={userSessionToken}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const page = parseInt(context.query.page as string) || 1;
  const limit = 20; // Default limit

  try {
    const API_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : process.env.NEXT_PUBLIC_API_URL;

    // Fetch current user and posts in parallel
    const [userResponse, postsResponse] = await Promise.all([
      fetch(`${API_URL}/api/session/me`, {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(API_ENDPOINTS.getPosts(1, page, limit), {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    if (!postsResponse.ok) {
      throw new Error(`API responded with status: ${postsResponse.status}`);
    }

    const postsData = await postsResponse.json();
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
        posts,
        username,
        userSessionToken,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return {
      props: {
        posts: [],
        username: 'Anonymous',
        userSessionToken: null,
        currentPage: 1,
        totalPages: 1,
        error: error instanceof Error ? error.message : 'Failed to load posts',
      },
    };
  }
};
