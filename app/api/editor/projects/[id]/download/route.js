import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertFilmCraftEnabled } from '@/lib/filmcraft/gate';
import { loadOwnedProject } from '@/lib/filmcraft/projects';

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
    const project = await loadOwnedProject(session.user.id, id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!project.packagePath || !fs.existsSync(project.packagePath)) {
      return NextResponse.json(
        { error: 'Package not ready — re-export or recreate the project' },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(project.packagePath);
    const filename = path.basename(project.packagePath) || `${id}.zip`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('[editor/projects/:id/download]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
