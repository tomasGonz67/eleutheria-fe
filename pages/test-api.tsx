import { GetServerSideProps } from 'next';
import { serverApi } from '@/lib/api';

interface Forum {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface Props {
  forums: Forum[];
  error?: string;
}

export default function TestAPI({ forums, error }: Props) {
  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error</h1>
        <p className="mt-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      <p className="text-green-600 mb-4">✓ Connected to backend successfully!</p>

      <h2 className="text-xl font-semibold mb-2">Forums from API:</h2>
      {forums.length === 0 ? (
        <p className="text-gray-600">No forums found</p>
      ) : (
        <ul className="space-y-2">
          {forums.map((forum) => (
            <li key={forum.id} className="border p-4 rounded">
              <h3 className="font-semibold">{forum.name}</h3>
              <p className="text-gray-600">{forum.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const response = await serverApi.get('/api/forums');
    return {
      props: {
        forums: response.data.forums || [],
      },
    };
  } catch (error: any) {
    console.error('API Error:', error.message);
    return {
      props: {
        forums: [],
        error: `Failed to connect to API: ${error.message}`,
      },
    };
  }
};
