import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getDb, schema } from '@/lib/db';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { loadOwnedProject } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Same-origin media proxy so FilmCraft WASM can importUrl without CDN CORS issues.
 */
export async function GET(_req, { params }) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id, assetId } = await params;
    const project = await loadOwnedProject(session.user.id, id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const db = getDb();
    const [asset] = await db
      .select()
      .from(schema.editorAssets)
      .where(
        and(
          eq(schema.editorAssets.id, assetId),
          eq(schema.editorAssets.projectId, id)
        )
      )
      .limit(1);

    if (!asset?.sourceUrl) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const upstream = await fetch(asset.sourceUrl, {
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
      (asset.kind === 'image'
        ? 'image/png'
        : asset.kind === 'audio'
          ? 'audio/mpeg'
          : 'video/mp4');

    const buf = Buffer.from(await upstream.arrayBuffer());
    const filename = asset.localName || `asset-${assetId}`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
        // Allow FilmCraft iframe (same origin) to read the body.
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch (err) {
    console.error('[editor asset file]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
