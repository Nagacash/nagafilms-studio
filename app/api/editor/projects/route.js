import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { createEditorProject, listProjectsForUser } from '@/lib/filmcraft/projects';

export const runtime = 'nodejs';

const createSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  generationIds: z.array(z.string().uuid()).min(1).max(40),
});

export async function GET() {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const projects = await listProjectsForUser(session.user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[editor/projects GET]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req) {
  const disabled = assertFilmCraftEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await createEditorProject({
      userId: session.user.id,
      name: parsed.data.name,
      generationIds: parsed.data.generationIds,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err.status || 500;
    console.error('[editor/projects POST]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
