import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import { getMotionZipForDownload } from '@/lib/motion/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const { buf, filename } = await getMotionZipForDownload(session.user.id, id);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[motion/projects/:id/download]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
