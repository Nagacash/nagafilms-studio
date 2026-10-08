import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import { addOutputToTimeline } from '@/lib/motion/outputs';

export const runtime = 'nodejs';

export async function POST(_req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id, outputId } = await params;
    const result = await addOutputToTimeline({
      userId: session.user.id,
      motionProjectId: id,
      outputId,
    });

    return NextResponse.json({
      assetId: result.asset.id,
      asset: result.asset,
      editorProjectId: result.editorProjectId,
      timelineInsert: result.timelineInsert,
      importUrl: result.importUrl,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[motion/outputs/add-to-timeline]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
