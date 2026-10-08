import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { extractResultUrls, getPredictionResult } from '@/lib/muapi-server';
import {
  extensionForUrl,
  firstResultUrl,
  kindFromGeneration,
} from './asset-utils';
import { prepareMotionDownloadPackage, readCachedMotionZip } from './handoff';

const {
  motionProjects,
  motionOutputs,
  editorProjects,
  editorAssets,
  generations,
} = schema;

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

export async function resolveGenerationsForUser(userId, generationIds) {
  if (!generationIds?.length) return [];

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

export async function loadOwnedMotionProject(userId, projectId) {
  const db = getDb();
  const [project] = await db
    .select()
    .from(motionProjects)
    .where(and(eq(motionProjects.id, projectId), eq(motionProjects.userId, userId)))
    .limit(1);
  return project || null;
}

export async function listMotionProjectsForUser(userId) {
  const db = getDb();
  return db
    .select()
    .from(motionProjects)
    .where(eq(motionProjects.userId, userId))
    .orderBy(desc(motionProjects.createdAt))
    .limit(100);
}

/**
 * Resolve owned media rows for a motion project (editor asset + generations).
 * Each item has a stable id used by the media file proxy.
 */
export async function resolveMotionMedia(userId, project) {
  const media = [];
  const db = getDb();

  if (project.sourceAssetId) {
    const [asset] = await db
      .select()
      .from(editorAssets)
      .where(eq(editorAssets.id, project.sourceAssetId))
      .limit(1);
    if (asset?.sourceUrl) {
      media.push({
        id: asset.id,
        filename: asset.localName,
        sourceUrl: asset.sourceUrl,
        kind: asset.kind || 'video',
        durationMs: asset.durationMs,
      });
    }
  }

  const genIds = project.metadata?.generationIds;
  if (Array.isArray(genIds) && genIds.length) {
    try {
      const gens = await resolveGenerationsForUser(userId, genIds);
      for (const m of mediaFromGenerations(gens)) {
        if (media.some((x) => x.sourceUrl === m.sourceUrl || x.id === m.id)) continue;
        media.push(m);
      }
    } catch {
      /* keep asset-only media */
    }
  }

  if (!media.length && project.editorProjectId) {
    const rows = await db
      .select()
      .from(editorAssets)
      .where(eq(editorAssets.projectId, project.editorProjectId))
      .orderBy(asc(editorAssets.sortOrder))
      .limit(20);
    for (const asset of rows) {
      if (!asset.sourceUrl) continue;
      media.push({
        id: asset.id,
        filename: asset.localName,
        sourceUrl: asset.sourceUrl,
        kind: asset.kind || 'video',
        durationMs: asset.durationMs,
      });
    }
  }

  return media.map((m) => ({
    ...m,
    proxyUrl: `/api/motion/projects/${project.id}/media/${m.id}/file`,
  }));
}

export async function getMotionProjectDetail(userId, projectId) {
  const project = await loadOwnedMotionProject(userId, projectId);
  if (!project) return null;

  const db = getDb();
  const outputs = await db
    .select()
    .from(motionOutputs)
    .where(eq(motionOutputs.motionProjectId, projectId))
    .orderBy(desc(motionOutputs.createdAt));

  let editorProject = null;
  let sourceAsset = null;
  if (project.editorProjectId) {
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
    editorProject = ep || null;
  }
  if (project.sourceAssetId) {
    const [asset] = await db
      .select()
      .from(editorAssets)
      .where(eq(editorAssets.id, project.sourceAssetId))
      .limit(1);
    sourceAsset = asset || null;
  }

  const media = await resolveMotionMedia(userId, project);

  return { project, outputs, editorProject, sourceAsset, media };
}

function mediaFromGenerations(gens) {
  return gens.map((g, i) => {
    const kind = kindFromGeneration(g);
    const url = firstResultUrl(g);
    const ext = extensionForUrl(url, kind);
    const filename = `clip-${String(i + 1).padStart(3, '0')}.${ext}`;
    const durationMs =
      g.params?.duration != null
        ? Math.round(Number(g.params.duration) * 1000)
        : g.params?.durationMs != null
          ? Number(g.params.durationMs)
          : null;
    return {
      id: g.id,
      filename,
      sourceUrl: url,
      kind,
      durationMs: Number.isFinite(durationMs) ? durationMs : null,
      generationId: g.id,
    };
  });
}

/**
 * Create Motion project from Studio generations and/or editor asset.
 */
export async function createMotionProject({
  userId,
  title,
  generationIds,
  editorProjectId,
  editorAssetId,
  sourceTimelineClipId,
}) {
  const hasGens = Array.isArray(generationIds) && generationIds.length > 0;
  const hasEditor = Boolean(editorProjectId || editorAssetId);

  if (!hasGens && !hasEditor) {
    const err = new Error('Provide generationIds and/or editorProjectId / editorAssetId');
    err.status = 400;
    throw err;
  }

  const db = getDb();
  let gens = [];
  if (hasGens) {
    gens = await resolveGenerationsForUser(userId, generationIds);
  }

  let editorProject = null;
  let sourceAsset = null;

  if (editorProjectId) {
    const [ep] = await db
      .select()
      .from(editorProjects)
      .where(
        and(eq(editorProjects.id, editorProjectId), eq(editorProjects.userId, userId))
      )
      .limit(1);
    if (!ep) {
      const err = new Error('Editor project not found or not owned');
      err.status = 403;
      throw err;
    }
    editorProject = ep;
  }

  if (editorAssetId) {
    const [asset] = await db
      .select()
      .from(editorAssets)
      .where(eq(editorAssets.id, editorAssetId))
      .limit(1);
    if (!asset) {
      const err = new Error('Editor asset not found');
      err.status = 404;
      throw err;
    }
    const [ep] = await db
      .select()
      .from(editorProjects)
      .where(
        and(eq(editorProjects.id, asset.projectId), eq(editorProjects.userId, userId))
      )
      .limit(1);
    if (!ep) {
      const err = new Error('Editor asset not owned');
      err.status = 403;
      throw err;
    }
    sourceAsset = asset;
    editorProject = editorProject || ep;
  }

  let editorAssetRows = [];
  if (sourceAsset) {
    editorAssetRows = [sourceAsset];
  } else if (editorProject && !hasGens) {
    editorAssetRows = await db
      .select()
      .from(editorAssets)
      .where(eq(editorAssets.projectId, editorProject.id))
      .orderBy(asc(editorAssets.sortOrder))
      .limit(20);
    if (editorAssetRows.length) sourceAsset = editorAssetRows[0];
  }

  const media = [];
  for (const asset of editorAssetRows) {
    media.push({
      id: asset.id,
      filename: asset.localName,
      sourceUrl: asset.sourceUrl,
      kind: asset.kind || 'video',
      durationMs: asset.durationMs,
    });
  }
  for (const m of mediaFromGenerations(gens)) {
    if (media.some((x) => x.sourceUrl === m.sourceUrl)) continue;
    media.push(m);
  }

  if (!media.length) {
    const err = new Error('No media available for Motion project');
    err.status = 400;
    throw err;
  }

  const projectTitle =
    (title && String(title).trim()) ||
    `Motion ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;

  const sourceGenerationId = gens[0]?.id || sourceAsset?.generationId || null;
  const motionId = randomUUID();
  const nagaProjectId = editorProject?.id || motionId;

  const [project] = await db
    .insert(motionProjects)
    .values({
      id: motionId,
      userId,
      nagaProjectId,
      editorProjectId: editorProject?.id || null,
      sourceAssetId: sourceAsset?.id || null,
      sourceTimelineClipId: sourceTimelineClipId || null,
      sourceGenerationId,
      title: projectTitle,
      status: 'draft',
      metadata: {
        generationIds: gens.map((g) => g.id),
        mediaCount: media.length,
      },
    })
    .returning();

  try {
    const prepared = await prepareMotionDownloadPackage({
      motionProjectId: project.id,
      nagaProjectId,
      editorProjectId: editorProject?.id || null,
      sourceAssetId: sourceAsset?.id || null,
      sourceTimelineClipId: sourceTimelineClipId || null,
      sourceGenerationId,
      title: projectTitle,
      media,
      durationMs: media[0]?.durationMs ?? null,
    });

    const [updated] = await db
      .update(motionProjects)
      .set({
        status: 'ready',
        packagePath: prepared.packagePath,
        effectcraftProjectRef: prepared.effectcraftProjectRef,
        metadata: {
          ...(project.metadata || {}),
          handoffMode: prepared.mode,
          mediaCount: media.length,
        },
        updatedAt: new Date(),
      })
      .where(eq(motionProjects.id, project.id))
      .returning();

    return {
      project: updated || { ...project, status: 'ready' },
      mode: prepared.mode,
      media,
    };
  } catch (err) {
    console.error('[motion] package build failed', err);
    const [failed] = await db
      .update(motionProjects)
      .set({
        status: 'failed',
        metadata: {
          ...(project.metadata || {}),
          error: err.message || 'Package build failed',
        },
        updatedAt: new Date(),
      })
      .where(eq(motionProjects.id, project.id))
      .returning();

    const e = new Error(err.message || 'Package build failed');
    e.status = 500;
    e.project = failed || project;
    throw e;
  }
}

export async function openMotionHandoff(userId, projectId) {
  const detail = await getMotionProjectDetail(userId, projectId);
  if (!detail) {
    const err = new Error('Motion project not found');
    err.status = 404;
    throw err;
  }

  const { project, sourceAsset } = detail;
  const db = getDb();
  const media = [];

  if (sourceAsset) {
    media.push({
      id: sourceAsset.id,
      filename: sourceAsset.localName,
      sourceUrl: sourceAsset.sourceUrl,
      kind: sourceAsset.kind || 'video',
      durationMs: sourceAsset.durationMs,
    });
  }

  const genIds = project.metadata?.generationIds;
  if (Array.isArray(genIds) && genIds.length) {
    try {
      const gens = await resolveGenerationsForUser(userId, genIds);
      for (const m of mediaFromGenerations(gens)) {
        if (media.some((x) => x.sourceUrl === m.sourceUrl)) continue;
        media.push(m);
      }
    } catch {
      /* keep existing media */
    }
  }

  if (!media.length && project.packagePath) {
    const cached = await readCachedMotionZip(project.packagePath);
    if (cached) {
      await db
        .update(motionProjects)
        .set({ status: 'opened', updatedAt: new Date() })
        .where(eq(motionProjects.id, projectId));
      return {
        mode: 'download',
        downloadUrl: `/api/motion/projects/${projectId}/download`,
        projectId,
      };
    }
  }

  if (!media.length) {
    const err = new Error('No media to rebuild Motion package');
    err.status = 400;
    throw err;
  }

  const prepared = await prepareMotionDownloadPackage({
    motionProjectId: project.id,
    nagaProjectId: project.nagaProjectId,
    editorProjectId: project.editorProjectId,
    sourceAssetId: project.sourceAssetId,
    sourceTimelineClipId: project.sourceTimelineClipId,
    sourceGenerationId: project.sourceGenerationId,
    title: project.title,
    media,
    durationMs: media[0]?.durationMs ?? null,
  });

  await db
    .update(motionProjects)
    .set({
      status: 'opened',
      packagePath: prepared.packagePath,
      effectcraftProjectRef: prepared.effectcraftProjectRef,
      updatedAt: new Date(),
    })
    .where(eq(motionProjects.id, projectId));

  return {
    mode: 'download',
    downloadUrl: `/api/motion/projects/${projectId}/download`,
    projectId,
  };
}

export async function getMotionZipForDownload(userId, projectId) {
  const project = await loadOwnedMotionProject(userId, projectId);
  if (!project) {
    const err = new Error('Motion project not found');
    err.status = 404;
    throw err;
  }

  let buf = await readCachedMotionZip(project.packagePath);
  if (buf) {
    return { buf, filename: `${project.title.replace(/[^\w.-]+/g, '_') || 'motion'}.zip` };
  }

  const open = await openMotionHandoff(userId, projectId);
  const refreshed = await loadOwnedMotionProject(userId, projectId);
  buf = await readCachedMotionZip(refreshed?.packagePath);
  if (!buf) {
    // Rebuild in-memory via open path already wrote — if still missing, fail
    const err = new Error('Motion package unavailable');
    err.status = 500;
    throw err;
  }
  return {
    buf,
    filename: `${(refreshed || project).title.replace(/[^\w.-]+/g, '_') || 'motion'}.zip`,
    open,
  };
}
