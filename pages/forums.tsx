import Link from 'next/link';
import Header from '@/components/Header';

export default function ForumsPage() {
  // Mock data - will be replaced with real API data later
  const forums = [
    {
      id: 1,
      name: 'General Discussion',
      description: 'Talk about anything and everything',
      created_at: '2025-01-10T12:00:00Z',
    },
    {
      id: 2,
      name: 'Technology',
      description: 'Discuss the latest in tech, programming, and innovation',
      created_at: '2025-01-11T15:30:00Z',
    },
    {
      id: 3,
      name: 'Philosophy',
      description: 'Deep thoughts and philosophical discussions',
      created_at: '2025-01-12T09:00:00Z',
    },
    {
      id: 4,
      name: 'Gaming',
      description: 'Video games, board games, and gaming culture',
      created_at: '2025-01-13T18:45:00Z',
    },
  ];

  return (
    <div className="min-h-screen bg-marble-100">
      <Header currentPage="forums" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white p-8 rounded-lg border-4" style={{ borderColor: '#4D89B0' }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Forums</h1>
            <button
              className="px-4 py-2 text-white rounded-lg transition font-semibold"
              style={{ backgroundColor: '#4D89B0' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3d6e8f'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4D89B0'}
            >
              Create Forum
            </button>
          </div>

          {/* Forums List */}
          <div className="space-y-4">
            {forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/forums/${forum.id}`}
                className="block bg-white p-6 rounded-lg border-2 hover:shadow-lg transition"
                style={{ borderColor: '#4D89B0' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{forum.name}</h2>
                    <p className="text-gray-600">{forum.description}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                    {new Date(forum.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Empty State */}
          {forums.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No forums yet. Create the first one!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
