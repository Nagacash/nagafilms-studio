import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { getProjectWithAssets } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';

export async function GET(_req, { params }) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const detail = await getProjectWithAssets(session.user.id, id);
    if (!detail) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error('[editor/projects/:id GET]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
