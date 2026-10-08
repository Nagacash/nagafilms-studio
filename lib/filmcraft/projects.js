import fs from 'node:fs';
import path from 'node:path';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import {
  extractResultUrls,
  getPredictionResult,
} from '@/lib/muapi-server';
import { preparePackage, runExport } from './handoff';
import {
  extensionForUrl,
  firstResultUrl,
  kindFromGeneration,
} from './asset-utils';

const { editorProjects, editorAssets, generations } = schema;

export { extensionForUrl, firstResultUrl, kindFromGeneration };

export async function loadOwnedProject(userId, projectId) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(editorProjects)
    .where(and(eq(editorProjects.id, projectId), eq(editorProjects.userId, userId)))
    .limit(1);
  return project || null;
}

export async function listProjectsForUser(userId) {
  const db = getDb();
  return db
    .select()
    .from(editorProjects)
    .where(eq(editorProjects.userId, userId))
    .orderBy(desc(editorProjects.createdAt))
    .limit(100);
}

export async function getProjectWithAssets(userId, projectId) {
  const project = await loadOwnedProject(userId, projectId);
  if (!project) return null;
  const db = getDb();
  const assets = await db
    .select()
    .from(editorAssets)
    .where(eq(editorAssets.projectId, projectId))
    .orderBy(asc(editorAssets.sortOrder));
  return { project, assets };
}

/**
 * Studio history often stores MuAPI request_id, while billing rows use a
 * separate generations.id. Accept either key.
 */
async function ensureResultUrls(db, row) {
  if (firstResultUrl(row)) return row;
  if (!row.muapiRequestId) return row;

  try {
    const result = await getPredictionResult(row.muapiRequestId);
    const urls = extractResultUrls(result);
    if (!urls.length) return row;

    const [updated] = await db
      .update(generations)
      .set({
        resultUrls: urls,
        status: 'completed',
        completedAt: row.completedAt || new Date(),
      })
      .where(eq(generations.id, row.id))
      .returning();
    return updated || { ...row, resultUrls: urls, status: 'completed' };
  } catch {
    return row;
  }
}

/**
 * Validate generation ids belong to user and are usable.
 * Ids may be generations.id or generations.muapiRequestId.
 */
export async function resolveGenerationsForUser(userId, generationIds) {
  if (!generationIds?.length) {
    const err = new Error('generationIds required');
    err.status = 400;
    throw err;
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        or(
          inArray(generations.id, generationIds),
          inArray(generations.muapiRequestId, generationIds)
        )
      )
    );

  const byKey = new Map();
  for (const row of rows) {
    byKey.set(row.id, row);
    if (row.muapiRequestId) byKey.set(String(row.muapiRequestId), row);
  }

  const ordered = [];
  const seenDbIds = new Set();
  for (const id of generationIds) {
    const row = byKey.get(id);
    if (!row || seenDbIds.has(row.id)) {
      const err = new Error('One or more generations not found or not owned');
      err.status = 403;
      throw err;
    }
    seenDbIds.add(row.id);
    ordered.push(row);
  }

  const withUrls = [];
  for (const row of ordered) {
    const ready = await ensureResultUrls(db, row);
    if (ready.status !== 'completed') {
      const err = new Error(`Generation ${ready.id} is not completed`);
      err.status = 400;
      throw err;
    }
    if (!firstResultUrl(ready)) {
      const err = new Error(`Generation ${ready.id} has no result URL`);
      err.status = 400;
      throw err;
    }
    withUrls.push(ready);
  }

  return withUrls;
}

function assetRowsFromGenerations(projectId, gens, startOrder = 0) {
  return gens.map((g, i) => {
    const kind = kindFromGeneration(g);
    const url = firstResultUrl(g);
    const ext = extensionForUrl(url, kind);
    const localName = `clip-${String(startOrder + i + 1).padStart(3, '0')}.${ext}`;
    const durationMs =
      g.params?.duration != null
        ? Math.round(Number(g.params.duration) * 1000)
        : g.params?.durationMs != null
          ? Number(g.params.durationMs)
          : null;
    return {
      projectId,
      generationId: g.id,
      kind,
      sourceUrl: url,
      localName,
      durationMs: Number.isFinite(durationMs) ? durationMs : null,
      sortOrder: startOrder + i,
      metadata: {
        model: g.model,
        prompt: g.prompt,
        modality: g.modality,
      },
    };
  });
}

export async function createEditorProject({ userId, name, generationIds }) {
  const gens = await resolveGenerationsForUser(userId, generationIds);
  const db = getDb();
  const projectName =
    (name && String(name).trim()) ||
    `Edit ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  const [project] = await db
    .insert(editorProjects)
    .values({
      userId,
      name: projectName,
      status: 'draft',
      metadata: { generationIds },
    })
    .returning();

  const assetValues = assetRowsFromGenerations(project.id, gens);
  const assets = await db.insert(editorAssets).values(assetValues).returning();

  try {
    const prepared = await preparePackage({
      projectId: project.id,
      name: project.name,
      assets: assets.map((a) => ({
        id: a.id,
        localName: a.localName,
        sourceUrl: a.sourceUrl,
        durationMs: a.durationMs,
        kind: a.kind,
      })),
    });

    const [updated] = await db
      .update(editorProjects)
      .set({
        status: 'ready',
        packagePath: prepared.packagePath,
        filmcraftRef: prepared.filmcraftRef,
        updatedAt: new Date(),
      })
      .where(eq(editorProjects.id, project.id))
      .returning();

    return { project: updated, assets };
  } catch (err) {
    await db
      .update(editorProjects)
      .set({
        status: 'export_failed',
        exportError: err.message || 'Package prepare failed',
        updatedAt: new Date(),
      })
      .where(eq(editorProjects.id, project.id));
    throw err;
  }
}

export async function attachAssetsToProject({ userId, projectId, generationIds }) {
  const project = await loadOwnedProject(userId, projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  const gens = await resolveGenerationsForUser(userId, generationIds);
  const db = getDb();
  const existing = await db
    .select()
    .from(editorAssets)
    .where(eq(editorAssets.projectId, projectId))
    .orderBy(asc(editorAssets.sortOrder));

  const startOrder = existing.length
    ? Math.max(...existing.map((a) => a.sortOrder)) + 1
    : 0;
  const assetValues = assetRowsFromGenerations(projectId, gens, startOrder);
  const inserted = await db.insert(editorAssets).values(assetValues).returning();
  const allAssets = [...existing, ...inserted];

  const prepared = await preparePackage({
    projectId,
    name: project.name,
    assets: allAssets.map((a) => ({
      id: a.id,
      localName: a.localName,
      sourceUrl: a.sourceUrl,
      durationMs: a.durationMs,
      kind: a.kind,
    })),
  });

  const [updated] = await db
    .update(editorProjects)
    .set({
      status: 'ready',
      packagePath: prepared.packagePath,
      filmcraftRef: prepared.filmcraftRef,
      exportError: null,
      updatedAt: new Date(),
    })
    .where(eq(editorProjects.id, projectId))
    .returning();

  return { project: updated, assets: allAssets };
}

/**
 * Return zip bytes for download. Rebuilds from assets when /tmp cache is gone
 * (normal on Vercel cold starts).
 */
export async function getProjectZipBuffer(userId, projectId) {
  const detail = await getProjectWithAssets(userId, projectId);
  if (!detail) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }
  if (!detail.assets.length) {
    const err = new Error('Project has no assets');
    err.status = 400;
    throw err;
  }

  const cached = detail.project.packagePath;
  if (cached && fs.existsSync(cached)) {
    return {
      buffer: fs.readFileSync(cached),
      filename: path.basename(cached) || `${projectId}.zip`,
      project: detail.project,
    };
  }

  const prepared = await preparePackage({
    projectId,
    name: detail.project.name,
    assets: detail.assets.map((a) => ({
      id: a.id,
      localName: a.localName,
      sourceUrl: a.sourceUrl,
      durationMs: a.durationMs,
      kind: a.kind,
    })),
  });

  const db = getDb();
  await db
    .update(editorProjects)
    .set({
      status: 'ready',
      packagePath: prepared.packagePath,
      filmcraftRef: prepared.filmcraftRef,
      exportError: null,
      updatedAt: new Date(),
    })
    .where(eq(editorProjects.id, projectId));

  const buffer = prepared.zipBuf;
  if (!buffer) {
    if (prepared.packagePath && fs.existsSync(prepared.packagePath)) {
      return {
        buffer: fs.readFileSync(prepared.packagePath),
        filename: path.basename(prepared.packagePath),
        project: detail.project,
      };
    }
    const err = new Error('Package rebuild produced no zip');
    err.status = 500;
    throw err;
  }

  return {
    buffer,
    filename: `${projectId}.zip`,
    project: detail.project,
  };
}

export async function exportEditorProject({ userId, projectId }) {
  const detail = await getProjectWithAssets(userId, projectId);
  if (!detail) {
    const err = new Error('Project not found');
    err.status = 404;
    throw err;
  }

  const db = getDb();
  await db
    .update(editorProjects)
    .set({ status: 'export_queued', exportError: null, updatedAt: new Date() })
    .where(eq(editorProjects.id, projectId));

  await db
    .update(editorProjects)
    .set({ status: 'export_processing', updatedAt: new Date() })
    .where(eq(editorProjects.id, projectId));

  try {
    const result = await runExport({
      projectId,
      name: detail.project.name,
      filmcraftRef: detail.project.filmcraftRef,
      assets: detail.assets.map((a) => ({
        id: a.id,
        localName: a.localName,
        sourceUrl: a.sourceUrl,
        durationMs: a.durationMs,
        kind: a.kind,
      })),
    });

    const [updated] = await db
      .update(editorProjects)
      .set({
        status: result.status || 'export_completed',
        packagePath: result.packagePath || detail.project.packagePath,
        filmcraftRef: result.filmcraftRef || detail.project.filmcraftRef,
        exportUrl: result.exportUrl,
        exportError: null,
        updatedAt: new Date(),
      })
      .where(eq(editorProjects.id, projectId))
      .returning();

    return { project: updated, assets: detail.assets };
  } catch (err) {
    const [updated] = await db
      .update(editorProjects)
      .set({
        status: 'export_failed',
        exportError: err.message || 'Export failed',
        updatedAt: new Date(),
      })
      .where(eq(editorProjects.id, projectId))
      .returning();
    return { project: updated, assets: detail.assets, error: err.message };
  }
}
