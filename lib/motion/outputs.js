import fs from 'node:fs/promises';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getMotionBucket } from './config';
import { hasAlphaFromFormat } from './asset-utils';
import { validateOutputUpload } from './validation';
import { loadOwnedMotionProject } from './projects';

export { validateOutputUpload };

const { motionProjects, motionOutputs, editorAssets, editorProjects } = schema;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Persist uploaded render under motion bucket; create motion_outputs row.
 */
export async function createMotionOutputFromUpload({
  userId,
  motionProjectId,
  filename,
  mimeType,
  buffer,
  durationMs,
  width,
  height,
  fps,
}) {
  const project = await loadOwnedMotionProject(userId, motionProjectId);
  if (!project) {
    const err = new Error('Motion project not found');
    err.status = 404;
    throw err;
  }

  const { filename: safeName, format } = validateOutputUpload({
    filename,
    mimeType,
    sizeBytes: buffer?.length,
  });

  if (!buffer?.length) {
    const err = new Error('Empty upload');
    err.status = 400;
    throw err;
  }

  const bucket = getMotionBucket();
  const outDir = path.join(bucket, motionProjectId, 'outputs');
  const storageKey = path.join(outDir, `${Date.now()}-${safeName}`);

  try {
    await ensureDir(outDir);
    await fs.writeFile(storageKey, buffer);
  } catch (err) {
    console.error('[motion] output write failed', err);
    const e = new Error('Failed to store output file');
    e.status = 500;
    throw e;
  }

  const db = getDb();
  const [output] = await db
    .insert(motionOutputs)
    .values({
      motionProjectId,
      filename: safeName,
      storageKey,
      sourceUrl: null,
      format,
      hasAlpha: hasAlphaFromFormat(format) ? 1 : 0,
      durationMs: durationMs ?? null,
      width: width ?? null,
      height: height ?? null,
      fps: fps ?? null,
      status: 'ready',
    })
    .returning();

  await db
    .update(motionProjects)
    .set({ status: 'imported', updatedAt: new Date() })
    .where(eq(motionProjects.id, motionProjectId));

  return output;
}

/**
 * Register output from a user-owned URL (e.g. already uploaded elsewhere).
 */
export async function createMotionOutputFromUrl({
  userId,
  motionProjectId,
  filename,
  sourceUrl,
  format,
  durationMs,
  width,
  height,
  fps,
}) {
  const project = await loadOwnedMotionProject(userId, motionProjectId);
  if (!project) {
    const err = new Error('Motion project not found');
    err.status = 404;
    throw err;
  }

  const url = String(sourceUrl || '').trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const err = new Error('sourceUrl must be http(s)');
    err.status = 400;
    throw err;
  }

  const name = filename || path.basename(new URL(url).pathname) || 'render.mp4';
  const { filename: safeName, format: fmt } = validateOutputUpload({
    filename: name,
    mimeType: 'application/octet-stream',
    sizeBytes: 1,
  });

  const db = getDb();
  const [output] = await db
    .insert(motionOutputs)
    .values({
      motionProjectId,
      filename: safeName,
      storageKey: null,
      sourceUrl: url,
      format: format || fmt,
      hasAlpha: hasAlphaFromFormat(format || fmt) ? 1 : 0,
      durationMs: durationMs ?? null,
      width: width ?? null,
      height: height ?? null,
      fps: fps ?? null,
      status: 'ready',
    })
    .returning();

  await db
    .update(motionProjects)
    .set({ status: 'imported', updatedAt: new Date() })
    .where(eq(motionProjects.id, motionProjectId));

  return output;
}

export async function loadOwnedOutput(userId, motionProjectId, outputId) {
  const project = await loadOwnedMotionProject(userId, motionProjectId);
  if (!project) return null;

  const db = getDb();
  const [output] = await db
    .select()
    .from(motionOutputs)
    .where(
      and(
        eq(motionOutputs.id, outputId),
        eq(motionOutputs.motionProjectId, motionProjectId)
      )
    )
    .limit(1);
  return output ? { project, output } : null;
}

/**
 * Attach motion output as editor_assets row on linked editor project.
 */
export async function addOutputToTimeline({ userId, motionProjectId, outputId }) {
  const owned = await loadOwnedOutput(userId, motionProjectId, outputId);
  if (!owned) {
    const err = new Error('Output not found');
    err.status = 404;
    throw err;
  }

  const { project, output } = owned;
  if (!project.editorProjectId) {
    const err = new Error('No linked Film Editor project — open Editor and attach manually');
    err.status = 400;
    throw err;
  }

  const db = getDb();
  const [ep] = await db
    .select()
    .from(editorProjects)
    .where(
      and(
        eq(editorProjects.id, project.editorProjectId),
        eq(editorProjects.userId, userId)
      )
    )
    .limit(1);

  if (!ep) {
    const err = new Error('Linked editor project not found');
    err.status = 404;
    throw err;
  }

  const sourceUrl =
    output.sourceUrl ||
    `/api/motion/projects/${motionProjectId}/outputs/${outputId}/file`;

  const kind =
    ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(output.format) ? 'image' : 'video';

  const [asset] = await db
    .insert(editorAssets)
    .values({
      projectId: ep.id,
      generationId: project.sourceGenerationId || null,
      kind,
      sourceUrl,
      localName: output.filename,
      durationMs: output.durationMs,
      sortOrder: 999,
      metadata: {
        fromMotionOutputId: output.id,
        motionProjectId,
        hasAlpha: Boolean(output.hasAlpha),
      },
    })
    .returning();

  await db
    .update(motionOutputs)
    .set({ assetId: asset.id, status: 'attached', updatedAt: new Date() })
    .where(eq(motionOutputs.id, output.id));

  await db
    .update(motionProjects)
    .set({ status: 'exported', updatedAt: new Date() })
    .where(eq(motionProjects.id, motionProjectId));

  // client_import when FilmCraft web can pull importUrl; otherwise manual
  const timelineInsert =
    process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED === '1'
      ? 'client_import'
      : 'manual';

  return {
    asset,
    editorProjectId: ep.id,
    timelineInsert,
    importUrl: sourceUrl,
  };
}

export async function readOutputFileBuffer(storageKey) {
  if (!storageKey) return null;
  try {
    return await fs.readFile(storageKey);
  } catch {
    return null;
  }
}
