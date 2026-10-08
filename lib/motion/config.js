import os from 'node:os';
import path from 'node:path';

export function isMotionEnabled() {
  const v = String(process.env.MOTION_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function getEffectCraftMode() {
  const mode = String(process.env.EFFECTCRAFT_MODE || 'download').toLowerCase();
  if (mode === 'local' || mode === 'web' || mode === 'download') return mode;
  return 'download';
}

export function isEffectCraftWebEnabled() {
  const v = String(
    process.env.EFFECTCRAFT_WEB_ENABLED || process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED || ''
  ).toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Prefer in-browser editor when WASM flag on; zip download always still works. */
export function getHandoffMode() {
  if (isEffectCraftWebEnabled()) return 'web';
  return 'download';
}

/**
 * Package / output cache dir. Vercel `/var/task` is read-only — default to os.tmpdir().
 */
export function getMotionBucket() {
  const configured = process.env.MOTION_PROJECT_BUCKET?.trim();
  const tmpDefault = path.join(os.tmpdir(), 'motion-projects');

  if (process.env.VERCEL) {
    if (!configured) return tmpDefault;
    const resolved = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
    if (resolved.startsWith(process.cwd()) || resolved.startsWith('/var/task')) {
      return tmpDefault;
    }
    return resolved;
  }

  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
  return path.join(process.cwd(), '.data', 'motion-projects');
}

export const MAX_OUTPUT_BYTES = 500 * 1024 * 1024; // 500 MB

export const ALLOWED_OUTPUT_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_OUTPUT_EXT = new Set([
  'mp4',
  'webm',
  'mov',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
]);
