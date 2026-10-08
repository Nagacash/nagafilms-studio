import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { getProjectZipBuffer } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(_req, { params }) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const { buffer, filename } = await getProjectZipBuffer(session.user.id, id);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[editor/projects/:id/download]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
