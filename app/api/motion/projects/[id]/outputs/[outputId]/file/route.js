import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import { loadOwnedOutput, readOutputFileBuffer } from '@/lib/motion/outputs';

export const runtime = 'nodejs';

const MIME = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(_req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id, outputId } = await params;
    const owned = await loadOwnedOutput(session.user.id, id, outputId);
    if (!owned) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { output } = owned;

    if (output.storageKey) {
      const buf = await readOutputFileBuffer(output.storageKey);
      if (!buf) {
        return NextResponse.json({ error: 'File missing' }, { status: 404 });
      }
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': MIME[output.format] || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${output.filename}"`,
          'Content-Length': String(buf.length),
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (output.sourceUrl) {
      return NextResponse.redirect(output.sourceUrl, 302);
    }

    return NextResponse.json({ error: 'No file' }, { status: 404 });
  } catch (err) {
    console.error('[motion/outputs/file]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
