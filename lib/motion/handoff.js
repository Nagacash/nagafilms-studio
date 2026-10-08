import fs from 'node:fs/promises';
import path from 'node:path';
import { buildZipStore } from '@/lib/filmcraft/zip-store';
import { getHandoffMode, getMotionBucket } from './config';
import { buildMotionManifest, openInMotionMarkdown } from './manifest';

const THIRD_PARTY = path.join(process.cwd(), 'third_party', 'effectcraft');

async function readThirdParty(name) {
  try {
    return await fs.readFile(path.join(THIRD_PARTY, name));
  } catch {
    return Buffer.from(
      `${name} unavailable — see https://github.com/storytold/effectcraft\n`,
      'utf8'
    );
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchToBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch asset (${res.status}): ${url.slice(0, 120)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Build media + naga-motion-project.json zip (no invented .ecproj).
 * @param {{
 *   motionProjectId: string,
 *   nagaProjectId: string,
 *   editorProjectId?: string|null,
 *   sourceAssetId?: string|null,
 *   sourceTimelineClipId?: string|null,
 *   sourceGenerationId?: string|null,
 *   title: string,
 *   media: Array<{ id?: string, filename: string, sourceUrl: string, kind?: string, durationMs?: number|null, width?: number|null, height?: number|null, fps?: number|null, inPointMs?: number|null, outPointMs?: number|null }>,
 *   width?: number|null,
 *   height?: number|null,
 *   fps?: number|null,
 *   durationMs?: number|null,
 * }} input
 */
export async function prepareMotionDownloadPackage(input) {
  const zipEntries = [];
  const mediaMeta = [];

  for (let i = 0; i < input.media.length; i++) {
    const m = input.media[i];
    const filename = m.filename || `clip-${String(i + 1).padStart(3, '0')}.mp4`;
    const data = await fetchToBuffer(m.sourceUrl);
    const relativePath = `media/${filename}`;
    zipEntries.push({ name: relativePath, data });
    mediaMeta.push({
      id: m.id || `media-${i + 1}`,
      filename,
      relativePath,
      kind: m.kind || 'video',
      sourceUrl: null,
      durationMs: m.durationMs ?? null,
      width: m.width ?? null,
      height: m.height ?? null,
      fps: m.fps ?? null,
      inPointMs: m.inPointMs ?? null,
      outPointMs: m.outPointMs ?? null,
    });
  }

  const manifest = buildMotionManifest({
    motionProjectId: input.motionProjectId,
    nagaProjectId: input.nagaProjectId,
    editorProjectId: input.editorProjectId,
    sourceAssetId: input.sourceAssetId,
    sourceTimelineClipId: input.sourceTimelineClipId,
    sourceGenerationId: input.sourceGenerationId,
    title: input.title,
    media: mediaMeta,
    width: input.width,
    height: input.height,
    fps: input.fps,
    durationMs: input.durationMs,
  });

  zipEntries.push({
    name: 'naga-motion-project.json',
    data: `${JSON.stringify(manifest, null, 2)}\n`,
  });
  zipEntries.push({
    name: 'OPEN_IN_MOTION.md',
    data: openInMotionMarkdown(input.title),
  });
  zipEntries.push({ name: 'third_party/effectcraft/NOTICE', data: await readThirdParty('NOTICE') });
  zipEntries.push({
    name: 'third_party/effectcraft/LICENSE-MIT',
    data: await readThirdParty('LICENSE-MIT'),
  });
  zipEntries.push({
    name: 'third_party/effectcraft/LICENSE-APACHE',
    data: await readThirdParty('LICENSE-APACHE'),
  });

  const zipBuf = buildZipStore(zipEntries);
  const bucket = getMotionBucket();
  const workDir = path.join(bucket, input.motionProjectId);
  const zipPath = path.join(workDir, `${input.motionProjectId}.zip`);

  try {
    await ensureDir(workDir);
    await fs.writeFile(zipPath, zipBuf);
  } catch (err) {
    console.warn('[motion] zip cache write skipped:', err.message);
  }

  return {
    mode: getHandoffMode(),
    packagePath: zipPath,
    effectcraftProjectRef: zipPath,
    workDir,
    zipBuf,
    manifest,
  };
}

export async function readCachedMotionZip(packagePath) {
  if (!packagePath) return null;
  try {
    return await fs.readFile(packagePath);
  } catch {
    return null;
  }
}
