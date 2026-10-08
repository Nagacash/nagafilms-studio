import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { buildOtioTimeline } from './otio';
import { buildZipStore } from './zip-store';
import {
  getFilmCraftCliPath,
  getFilmCraftMcpUrl,
  getFilmCraftMode,
  getProjectBucket,
} from './config';

const THIRD_PARTY = path.join(process.cwd(), 'third_party', 'filmcraft');

async function readThirdParty(name) {
  try {
    return await fs.readFile(path.join(THIRD_PARTY, name));
  } catch {
    return Buffer.from(`${name} unavailable — see https://github.com/storytold/filmcraft\n`, 'utf8');
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchToFile(url, destPath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch asset (${res.status}): ${url.slice(0, 120)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return buf;
}

function openInstructions(projectName) {
  return [
    `# ${projectName} — FilmCraft handoff (beta)`,
    '',
    'This package was created by Naga Films Studio for FilmCraft.',
    'FilmCraft is a separate open-source editor: https://github.com/storytold/filmcraft',
    '',
    '## Open in FilmCraft (desktop)',
    '',
    '1. Install / build FilmCraft from its repository (see its README).',
    '2. Unzip this package.',
    '3. In FilmCraft: File → Import (or drag) `timeline.otio`.',
    '4. FilmCraft should link clips under `media/` via relative paths.',
    '   If a clip is offline, use Link Media / Auto Relink and point at `media/`.',
    '',
    '## Optional CLI (documented)',
    '',
    '```sh',
    'filmcraft-cli --project edit.fcproj --save import media/*.mp4',
    'filmcraft-cli --project edit.fcproj exec file.import paths=\'["timeline.otio"]\'',
    '```',
    '',
    'Do not confuse FilmCraft with other ArtCraft apps. Naga Films only handoffs to FilmCraft.',
    '',
  ].join('\n');
}

/**
 * @param {{ projectId: string, name: string, assets: Array<{ id: string, localName: string, sourceUrl: string, durationMs?: number|null, kind?: string }> }} input
 */
export async function prepareDownloadPackage(input) {
  const bucket = getProjectBucket();
  const workDir = path.join(bucket, input.projectId);
  const mediaDir = path.join(workDir, 'media');
  await ensureDir(mediaDir);

  const clips = [];
  const zipEntries = [];

  for (let i = 0; i < input.assets.length; i++) {
    const asset = input.assets[i];
    const localName = asset.localName || `clip-${String(i + 1).padStart(3, '0')}.mp4`;
    const dest = path.join(mediaDir, localName);
    await fetchToFile(asset.sourceUrl, dest);
    const relativePath = `media/${localName}`;
    clips.push({
      name: path.parse(localName).name,
      relativePath,
      durationMs: asset.durationMs,
    });
    zipEntries.push({
      name: relativePath,
      data: await fs.readFile(dest),
    });
  }

  const otio = buildOtioTimeline({ name: input.name, clips });
  const otioJson = `${JSON.stringify(otio)}\n`;
  await fs.writeFile(path.join(workDir, 'timeline.otio'), otioJson, 'utf8');
  zipEntries.push({ name: 'timeline.otio', data: otioJson });
  zipEntries.push({ name: 'OPEN_IN_FILMCRAFT.md', data: openInstructions(input.name) });
  zipEntries.push({ name: 'third_party/filmcraft/NOTICE', data: await readThirdParty('NOTICE') });
  zipEntries.push({
    name: 'third_party/filmcraft/LICENSE-MIT',
    data: await readThirdParty('LICENSE-MIT'),
  });
  zipEntries.push({
    name: 'third_party/filmcraft/LICENSE-APACHE',
    data: await readThirdParty('LICENSE-APACHE'),
  });

  const zipBuf = buildZipStore(zipEntries);
  const zipPath = path.join(workDir, `${input.projectId}.zip`);
  await fs.writeFile(zipPath, zipBuf);

  return {
    mode: 'download',
    packagePath: zipPath,
    filmcraftRef: zipPath,
    workDir,
  };
}

function runCli(cliPath, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`filmcraft-cli timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `filmcraft-cli exited ${code}`));
    });
  });
}

/**
 * Documented CLI flow (docs/agents.md):
 * filmcraft-cli --project p.fcproj --save import a.mov b.wav
 */
export async function prepareCliProject(input) {
  const cli = getFilmCraftCliPath();
  if (!cli) {
    throw new Error('FILMCRAFT_CLI_PATH is not set');
  }

  const bucket = getProjectBucket();
  const workDir = path.join(bucket, input.projectId);
  const mediaDir = path.join(workDir, 'media');
  await ensureDir(mediaDir);

  const mediaPaths = [];
  for (let i = 0; i < input.assets.length; i++) {
    const asset = input.assets[i];
    const localName = asset.localName || `clip-${String(i + 1).padStart(3, '0')}.mp4`;
    const dest = path.join(mediaDir, localName);
    await fetchToFile(asset.sourceUrl, dest);
    mediaPaths.push(dest);
  }

  const fcproj = path.join(workDir, 'edit.fcproj');
  await runCli(cli, ['--project', fcproj, '--save', 'import', ...mediaPaths], {
    timeoutMs: 300000,
  });

  return {
    mode: 'cli',
    packagePath: fcproj,
    filmcraftRef: fcproj,
    workDir,
  };
}

/**
 * MCP mode: require FILMCRAFT_MCP_URL (HTTP JSON-RPC style endpoint you host)
 * or fall back to spawning `filmcraft-cli mcp --project …` is not HTTP —
 * for v1 we only support an HTTP MCP/control bridge URL that accepts
 * documented tool/command payloads. If unset, fail clearly.
 */
export async function prepareMcpProject(input) {
  const mcpUrl = getFilmCraftMcpUrl();
  if (!mcpUrl) {
    throw new Error(
      'FILMCRAFT_MCP_URL is not set. Start FilmCraft MCP (filmcraft-cli mcp) behind an HTTP bridge, or use FILMCRAFT_MODE=download|cli.'
    );
  }

  // First ensure media is on disk for absolute-path media_import
  const prepared = await prepareDownloadPackage(input);
  const mediaDir = path.join(prepared.workDir, 'media');
  const files = await fs.readdir(mediaDir);
  const absPaths = files.map((f) => path.join(mediaDir, f)).join('\n');

  const importRes = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      tool: 'media_import',
      arguments: { text: absPaths },
    }),
  });
  if (!importRes.ok) {
    const body = await importRes.text().catch(() => '');
    throw new Error(`MCP media_import failed (${importRes.status}): ${body.slice(0, 300)}`);
  }

  return {
    mode: 'mcp',
    packagePath: prepared.packagePath,
    filmcraftRef: mcpUrl,
    workDir: prepared.workDir,
  };
}

export async function preparePackage(input) {
  const mode = getFilmCraftMode();
  if (mode === 'cli') return prepareCliProject(input);
  if (mode === 'mcp') return prepareMcpProject(input);
  return prepareDownloadPackage(input);
}

/**
 * Export request — download mode re-zips; cli/mcp call documented file.exportMedia.
 */
export async function runExport(input) {
  const mode = getFilmCraftMode();
  const bucket = getProjectBucket();
  const workDir = path.join(bucket, input.projectId);
  await ensureDir(workDir);

  if (mode === 'download') {
    const result = await prepareDownloadPackage(input);
    return {
      status: 'export_completed',
      exportUrl: null,
      packagePath: result.packagePath,
      filmcraftRef: result.filmcraftRef,
    };
  }

  if (mode === 'cli') {
    const cli = getFilmCraftCliPath();
    if (!cli) throw new Error('FILMCRAFT_CLI_PATH is not set');
    const fcproj = input.filmcraftRef || path.join(workDir, 'edit.fcproj');
    const outPath = path.join(workDir, 'export.mp4');
    // Documented: command_run / exec file.exportMedia with wait
    await runCli(
      cli,
      [
        '--project',
        fcproj,
        'exec',
        'file.exportMedia',
        `path=${outPath}`,
        'wait=true',
      ],
      { timeoutMs: 600000 }
    );
    return {
      status: 'export_completed',
      exportUrl: null,
      packagePath: outPath,
      filmcraftRef: fcproj,
    };
  }

  // mcp
  const mcpUrl = getFilmCraftMcpUrl();
  if (!mcpUrl) throw new Error('FILMCRAFT_MCP_URL is not set');
  const outPath = path.join(workDir, 'export.mp4');
  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(600000),
    body: JSON.stringify({
      tool: 'command_run',
      arguments: {
        id: 'file.exportMedia',
        params: { path: outPath, wait: true },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MCP export failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return {
    status: 'export_completed',
    exportUrl: null,
    packagePath: outPath,
    filmcraftRef: mcpUrl,
  };
}

export { buildOtioTimeline, buildZipStore };
