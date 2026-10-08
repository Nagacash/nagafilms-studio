import os from 'node:os';
import path from 'node:path';

export function isFilmCraftEnabled() {
  const v = String(process.env.FILMCRAFT_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function getFilmCraftMode() {
  const mode = String(process.env.FILMCRAFT_MODE || 'download').toLowerCase();
  if (mode === 'cli' || mode === 'mcp' || mode === 'download') return mode;
  return 'download';
}

export function getFilmCraftCliPath() {
  return process.env.FILMCRAFT_CLI_PATH?.trim() || '';
}

export function getFilmCraftMcpUrl() {
  return process.env.FILMCRAFT_MCP_URL?.trim() || '';
}

/**
 * Package cache dir. Vercel `/var/task` is read-only — default to os.tmpdir().
 */
export function getProjectBucket() {
  const configured = process.env.FILMCRAFT_PROJECT_BUCKET?.trim();
  const tmpDefault = path.join(os.tmpdir(), 'filmcraft-projects');

  if (process.env.VERCEL) {
    if (!configured) return tmpDefault;
    const resolved = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
    // Relative / cwd paths are not writable on serverless.
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
  return path.join(process.cwd(), '.data', 'filmcraft-projects');
}

export function isFilmCraftWebEnabled() {
  const v = String(process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
