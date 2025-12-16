interface Post {
  id: number;
  content: string;
  username: string;
  created_at: string;
}

interface FeedProps {
  title?: string;
  description?: string;
  backLink?: {
    href: string;
    label: string;
  };
  posts: Post[];
}

export default function Feed({ title = 'Global Feed', description, backLink, posts }: FeedProps) {

  return (
    <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
      {backLink && (
        <a href={backLink.href} className="text-sm mb-4 inline-block hover:underline" style={{ color: '#4D89B0' }}>
          ← {backLink.label}
        </a>
      )}
      <h1 className="text-3xl font-bold mb-2 text-gray-800">{title}</h1>
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}
      {!description && <div className="mb-6" />}
      <div className="border border-black">
        {/* Create Post Section */}
        <div className="px-6 pt-6 pb-6 border-b border-black">
          <div className="mb-3">
            <span className="text-sm text-gray-600">Posting as: </span>
            <span className="font-semibold text-gray-800">WiseAthena</span>
          </div>
          <textarea
            placeholder="What's on your mind?"
            className="w-full p-3 border-2 border-gray-300 text-black rounded-lg focus:border-gray-800 focus:outline-none resize-none"
            rows={3}
            maxLength={300}
          />
          <div className="flex justify-end mt-3">
            <button
              className="px-6 py-2 text-white rounded-lg transition font-semibold"
              style={{ backgroundColor: '#4D89B0' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
            >
              Post
            </button>
          </div>
        </div>

        {/* Posts */}
        <div>
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`px-6 py-6 ${index !== posts.length - 1 ? 'border-b border-black' : ''}`}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-800">{post.username}</span>
                <span className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-gray-700 mb-4">{post.content}</p>

              {/* Post Actions */}
              <div className="flex gap-3">
                <button
                  className="text-sm font-semibold hover:underline"
                  style={{ color: '#4D89B0' }}
                >
                  View Comments
                </button>
                <p className="text-gray-500">|</p>
                <button
                  className="text-sm font-semibold hover:underline"
                  style={{ color: '#4D89B0' }}
                >
                  Reply
                </button>
              </div>
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
    </div>
  );
}
