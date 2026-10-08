import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isFilmCraftEnabled } from '@/lib/filmcraft/config';
import { getProjectWithAssets } from '@/lib/filmcraft/projects';
import EditorDetailClient from './EditorDetailClient';

export const metadata = {
  title: 'Editor project — Naga Films',
};

export default async function EditorDetailPage({ params }) {
  if (!isFilmCraftEnabled()) {
    return (
      <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
        <p className="text-sm text-white/50">FilmCraft handoff is disabled.</p>
        <Link href="/editor" className="mt-4 inline-block text-[#00ff88]">
          ← Back
        </Link>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/editor/${(await params).id}`);
  }

  const { id } = await params;
  const detail = await getProjectWithAssets(session.user.id, id);
  if (!detail) notFound();

  return (
    <EditorDetailClient
      initialProject={JSON.parse(JSON.stringify(detail.project))}
      initialAssets={JSON.parse(JSON.stringify(detail.assets))}
    />
  );
}
