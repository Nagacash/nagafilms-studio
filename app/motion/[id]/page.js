import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isMotionEnabled } from '@/lib/motion/config';
import { getMotionProjectDetail } from '@/lib/motion/projects';
import MotionDetailClient from './MotionDetailClient';

export const metadata = {
  title: 'Motion project — Naga Films',
};

export default async function MotionDetailPage({ params }) {
  if (!isMotionEnabled()) {
    return (
      <main className="min-h-screen bg-[#050505] px-6 py-16 text-white">
        <p className="text-sm text-white/50">Motion & VFX handoff is disabled.</p>
        <Link href="/motion" className="mt-4 inline-block text-[#00ff88]">
          ← Back
        </Link>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/motion/${(await params).id}`);
  }

  const { id } = await params;
  const detail = await getMotionProjectDetail(session.user.id, id);
  if (!detail) notFound();

  return (
    <MotionDetailClient
      initialProject={JSON.parse(JSON.stringify(detail.project))}
      initialOutputs={JSON.parse(JSON.stringify(detail.outputs))}
      initialEditorProject={
        detail.editorProject
          ? JSON.parse(JSON.stringify(detail.editorProject))
          : null
      }
      initialSourceAsset={
        detail.sourceAsset
          ? JSON.parse(JSON.stringify(detail.sourceAsset))
          : null
      }
      initialMedia={JSON.parse(JSON.stringify(detail.media || []))}
    />
  );
}
