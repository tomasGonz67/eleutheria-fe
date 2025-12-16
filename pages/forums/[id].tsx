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

interface Forum {
  id: number;
  name: string;
  description: string;
}

interface ForumPostsPageProps {
  forum: Forum;
  posts: Post[];
  error?: string;
}

export default function ForumPostsPage({ forum, posts, error }: ForumPostsPageProps) {
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
          <Feed
            title={forum.name}
            description={forum.description}
            backLink={{ href: '/forums', label: 'Back to Forums' }}
            posts={posts}
          />
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  try {
    // Fetch forum details and posts
    const [forumResponse, postsResponse] = await Promise.all([
      fetch(API_ENDPOINTS.getForum(parseInt(id)), {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
      fetch(API_ENDPOINTS.getPosts(parseInt(id)), {
        headers: {
          'Cookie': context.req.headers.cookie || '',
        },
      }),
    ]);

    if (!forumResponse.ok || !postsResponse.ok) {
      throw new Error('Failed to fetch forum data');
    }

    const forum = await forumResponse.json();
    const postsData = await postsResponse.json();

    // Handle different response formats
    const posts = Array.isArray(postsData) ? postsData : (postsData.posts || []);

    return {
      props: {
        forum,
        posts,
      },
    };
  } catch (error) {
    console.error('Error fetching forum:', error);
    return {
      props: {
        forum: { id: parseInt(id), name: 'Forum', description: '' },
        posts: [],
        error: error instanceof Error ? error.message : 'Failed to load forum',
      },
    };
  }
};
