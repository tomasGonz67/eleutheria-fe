import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '@/components/Header';

const COPY: Record<string, { title: string; body: string }> = {
  post: {
    title: 'This post has been deleted',
    body: 'The post you were trying to view is no longer available. It may have been removed by its author or for legal reasons.',
  },
  comment: {
    title: 'This comment has been deleted',
    body: 'The comment you were trying to view is no longer available. It may have been removed by its author or for legal reasons.',
  },
  forum: {
    title: 'This forum has been deleted',
    body: 'The forum you were trying to view is no longer available. It may have been removed by its creator or for legal reasons.',
  },
};

export default function DeletedPage() {
  const router = useRouter();
  const type = (router.query.type as string) || 'post';
  const { title, body } = COPY[type] || COPY.post;

  return (
    <div className="min-h-screen bg-marble-100 flex flex-col">
      <Head>
        <title>{title} | Eleutheria</title>
      </Head>
      <Header currentPage="forums" />
      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 w-full">
        <div className="bg-surface p-8 rounded-lg border-4 border-border-strong text-center">
          <div className="text-5xl mb-4">🗑️</div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">{title}</h1>
          <p className="text-text-secondary mb-6">{body}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/forums"
              className="px-6 py-3 bg-accent-forum hover:bg-accent-forum-hover text-text-on-color rounded-lg transition font-semibold"
            >
              Browse Forums
            </Link>
            <Link
              href="/feed"
              className="px-6 py-3 border-2 border-border-strong text-text-primary rounded-lg transition font-semibold hover:shadow-lg"
            >
              Back to Feed
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
