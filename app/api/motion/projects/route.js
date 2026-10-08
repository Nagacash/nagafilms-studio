import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import {
  createMotionProject,
  listMotionProjectsForUser,
} from '@/lib/motion/projects';

export const runtime = 'nodejs';
export const maxDuration = 60;

const createSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    generationIds: z.array(z.string().uuid()).max(40).optional(),
    editorProjectId: z.string().uuid().optional(),
    editorAssetId: z.string().uuid().optional(),
    sourceTimelineClipId: z.string().max(200).optional(),
  })
  .refine(
    (d) =>
      (d.generationIds && d.generationIds.length > 0) ||
      d.editorProjectId ||
      d.editorAssetId,
    { message: 'generationIds and/or editorProjectId / editorAssetId required' }
  );

export async function GET() {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const projects = await listMotionProjectsForUser(session.user.id);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[motion/projects GET]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(req) {
  const disabled = assertMotionEnabled();
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

    const result = await createMotionProject({
      userId: session.user.id,
      title: parsed.data.title,
      generationIds: parsed.data.generationIds,
      editorProjectId: parsed.data.editorProjectId,
      editorAssetId: parsed.data.editorAssetId,
      sourceTimelineClipId: parsed.data.sourceTimelineClipId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status = err.status || 500;
    console.error('[motion/projects POST]', err);
    return NextResponse.json(
      {
        error: err.message || 'Failed',
        project: err.project || undefined,
      },
      { status }
    );
  }
}
