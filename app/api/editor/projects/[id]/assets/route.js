import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { attachAssetsToProject } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';

const bodySchema = z.object({
  generationIds: z.array(z.string().uuid()).min(1).max(40),
});

export async function POST(req, { params }) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await attachAssetsToProject({
      userId: session.user.id,
      projectId: id,
      generationIds: parsed.data.generationIds,
    });

    return NextResponse.json(result);
  } catch (err) {
    const status = err.status || 500;
    console.error('[editor/projects/:id/assets]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
