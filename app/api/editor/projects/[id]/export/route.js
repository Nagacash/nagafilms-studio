import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { exportEditorProject } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';

export async function POST(_req, { params }) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const result = await exportEditorProject({
      userId: session.user.id,
      projectId: id,
    });

    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('[editor/projects/:id/export]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
