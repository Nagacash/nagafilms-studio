import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import { loadOwnedMotionProject, resolveMotionMedia } from '@/lib/motion/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Same-origin media proxy so EffectCraft WASM can addFile without CDN CORS issues.
 */
export async function GET(_req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id, mediaId } = await params;
    const project = await loadOwnedMotionProject(session.user.id, id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const media = await resolveMotionMedia(session.user.id, project);
    const item = media.find((m) => m.id === mediaId);
    if (!item?.sourceUrl) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const upstream = await fetch(item.sourceUrl, {
      signal: AbortSignal.timeout(120000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream media ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType =
      upstream.headers.get('content-type') ||
      (item.kind === 'image'
        ? 'image/png'
        : item.kind === 'audio'
          ? 'audio/mpeg'
          : 'video/mp4');

    const buf = Buffer.from(await upstream.arrayBuffer());
    const filename = item.filename || `media-${mediaId}`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch (err) {
    console.error('[motion media file]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
