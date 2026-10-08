import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getHandoffMode } from '@/lib/motion/config';
import { assertMotionEnabled } from '@/lib/motion/gate';
import { openMotionHandoff } from '@/lib/motion/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const mode = getHandoffMode();

    // Web mode: editor is already on the page; still rebuild zip for download fallback.
    const result = await openMotionHandoff(session.user.id, id);

    return NextResponse.json({
      mode,
      downloadUrl: result.downloadUrl,
      projectId: result.projectId,
      editorUrl: mode === 'web' ? `/motion/${id}` : undefined,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[motion/projects/:id/open]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
