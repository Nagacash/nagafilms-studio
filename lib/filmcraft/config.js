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

export function getProjectBucket() {
  const raw =
    process.env.FILMCRAFT_PROJECT_BUCKET?.trim() ||
    path.join(process.cwd(), '.data', 'filmcraft-projects');
  return path.resolve(raw);
}

export function isFilmCraftWebEnabled() {
  const v = String(process.env.NEXT_PUBLIC_FILMCRAFT_WEB_ENABLED || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
