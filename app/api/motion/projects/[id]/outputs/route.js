import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { assertMotionEnabled } from '@/lib/motion/gate';
import {
  createMotionOutputFromUpload,
  createMotionOutputFromUrl,
} from '@/lib/motion/outputs';
import { MAX_OUTPUT_BYTES } from '@/lib/motion/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const urlSchema = z.object({
  sourceUrl: z.string().url(),
  filename: z.string().min(1).max(200).optional(),
  format: z.string().max(20).optional(),
  durationMs: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().int().positive().optional(),
});

export async function POST(req, { params }) {
  const disabled = assertMotionEnabled();
  if (disabled) return disabled;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'file required' }, { status: 400 });
      }

      const ab = await file.arrayBuffer();
      if (ab.byteLength > MAX_OUTPUT_BYTES) {
        return NextResponse.json({ error: 'File too large' }, { status: 400 });
      }

      const output = await createMotionOutputFromUpload({
        userId: session.user.id,
        motionProjectId: id,
        filename: file.name || form.get('filename') || 'render.mp4',
        mimeType: file.type,
        buffer: Buffer.from(ab),
        durationMs: form.get('durationMs')
          ? Number(form.get('durationMs'))
          : undefined,
        width: form.get('width') ? Number(form.get('width')) : undefined,
        height: form.get('height') ? Number(form.get('height')) : undefined,
        fps: form.get('fps') ? Number(form.get('fps')) : undefined,
      });

      return NextResponse.json({ output }, { status: 201 });
    }

    const parsed = urlSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const output = await createMotionOutputFromUrl({
      userId: session.user.id,
      motionProjectId: id,
      ...parsed.data,
    });

    return NextResponse.json({ output }, { status: 201 });
  } catch (err) {
    const status = err.status || 500;
    console.error('[motion/projects/:id/outputs POST]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
