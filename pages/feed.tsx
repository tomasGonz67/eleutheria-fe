import Header from '@/components/Header';
import Feed from '@/components/Feed';
import { API_ENDPOINTS } from '@/config/api';
import { GetServerSideProps } from 'next';

interface Post {
  id: number;
  content: string;
  username: string;
  created_at: string;
}

interface FeedPageProps {
  posts: Post[];
  error?: string;
}

export default function FeedPage({ posts, error }: FeedPageProps) {
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
          <Feed posts={posts} />
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Fetch posts from forum 1 (global feed)
    const response = await fetch(API_ENDPOINTS.getPosts(1), {
      headers: {
        'Cookie': context.req.headers.cookie || '',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Handle different response formats
    const posts = Array.isArray(data) ? data : (data.posts || []);

    return {
      props: {
        posts,
      },
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return {
      props: {
        posts: [],
        error: error instanceof Error ? error.message : 'Failed to load posts',
      },
    };
  }
};
