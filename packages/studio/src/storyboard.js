import { uploadFile } from './muapi.js';

const V1_URL = typeof window !== 'undefined' ? '/api/v1' : 'https://api.muapi.ai/api/v1';

/**
 * Approximate Naga credit costs for storyboard steps.
 * MuAPI does not publish fixed storyboard prices in OpenAPI — these are
 * operator estimates so users can budget before kicking off long jobs.
 */
export const STORYBOARD_CREDIT_ESTIMATES = {
  generateProjectBase: 120,
  generateProjectPerEpisode: 55,
  generateProjectProMult: 1.5,
  generateLibrary: 90,
  generateShotsBase: 80,
  generateShotsPerShot: 10,
  generateScriptsBase: 40,
  generateScriptsPerEpisode: 18,
  generatePdf: 15,
  addEpisode: 70,
  addScene: 35,
  addShot: 25,
  regenShot: 20,
  regenCharacter: 30,
};

/**
 * @param {string} step
 * @param {{ episodes?: number, shots?: number, usePro?: boolean }} [ctx]
 * @returns {{ credits: number, label: string, note: string }}
 */
export function estimateStoryboardCredits(step, ctx = {}) {
  const e = STORYBOARD_CREDIT_ESTIMATES;
  const episodes = Math.max(1, Number(ctx.episodes) || 1);
  const shots = Math.max(0, Number(ctx.shots) || 0);
  const pro = Boolean(ctx.usePro);

  const table = {
    generateProject: () => {
      let credits = e.generateProjectBase + e.generateProjectPerEpisode * episodes;
      if (pro) credits = Math.round(credits * e.generateProjectProMult);
      return {
        credits,
        label: `~${credits} cr`,
        note: `${episodes} episode${episodes === 1 ? '' : 's'}${pro ? ' · Pro' : ''}`,
      };
    },
    blankProject: () => ({
      credits: 0,
      label: '0 cr',
      note: 'Shell only — generation billed later',
    }),
    generateLibrary: () => ({
      credits: e.generateLibrary,
      label: `~${e.generateLibrary} cr`,
      note: 'Character library pass',
    }),
    generateShots: () => {
      const credits =
        e.generateShotsBase + e.generateShotsPerShot * Math.max(shots, episodes * 8);
      return {
        credits,
        label: `~${credits} cr`,
        note: shots
          ? `Based on ${shots} existing shots`
          : `Rough estimate for ~${episodes * 8} shots`,
      };
    },
    generateScripts: () => {
      const credits = e.generateScriptsBase + e.generateScriptsPerEpisode * episodes;
      return {
        credits,
        label: `~${credits} cr`,
        note: `${episodes} episode${episodes === 1 ? '' : 's'}`,
      };
    },
    generatePdf: () => ({
      credits: e.generatePdf,
      label: `~${e.generatePdf} cr`,
      note: 'Consolidated PDF',
    }),
    addEpisode: () => ({
      credits: e.addEpisode,
      label: `~${e.addEpisode} cr`,
      note: 'AI episode insert',
    }),
    addScene: () => ({
      credits: e.addScene,
      label: `~${e.addScene} cr`,
      note: 'AI scene insert',
    }),
    addShot: () => ({
      credits: e.addShot,
      label: `~${e.addShot} cr`,
      note: 'AI shot insert',
    }),
    regenShot: () => ({
      credits: e.regenShot,
      label: `~${e.regenShot} cr`,
      note: 'Single shot regen',
    }),
    regenCharacter: () => ({
      credits: e.regenCharacter,
      label: `~${e.regenCharacter} cr`,
      note: 'Character regen',
    }),
  };

  const fn = table[step];
  if (!fn) {
    return { credits: 0, label: '—', note: 'Unknown step' };
  }
  return fn();
}

export function isActiveStoryboardStatus(status) {
  const s = String(status || '').toLowerCase();
  if (!s) return false;
  if (/(fail|error|cancel|complete|ready|succeed|done|idle|draft)/.test(s)) {
    return false;
  }
  return /(process|generat|queue|pending|runn|progress|start|creat|wait)/.test(s);
}

function apiFetch(url, init = {}, apiKey) {
  const next = { ...init };
  if (typeof window !== 'undefined') {
    next.credentials =
      apiKey === 'session' ? 'include' : (init.credentials ?? 'omit');
  }
  return fetch(url, next);
}

async function storyboardFetch(path, apiKey, { method = 'GET', body } = {}) {
  const response = await apiFetch(
    `${V1_URL}${path}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    },
    apiKey,
  );
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.error ||
      (typeof data?.message === 'string' ? data.message : null) ||
      text.slice(0, 160);
    throw new Error(
      typeof detail === 'string'
        ? detail
        : JSON.stringify(detail).slice(0, 160),
    );
  }
  return data;
}

function withWebhook(body, webhookUrl) {
  const next = { ...body };
  const url = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
  if (url) next.webhook_url = url;
  return next;
}

export async function listStoryboardProjects(apiKey) {
  const data = await storyboardFetch('/storyboard-projects', apiKey);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function createStoryboardProject(apiKey, payload) {
  return storyboardFetch('/storyboard-projects', apiKey, {
    method: 'POST',
    body: {
      title: payload.title,
      prompt: payload.prompt,
      num_episodes: payload.num_episodes ?? 1,
      target_duration_per_episode: payload.target_duration_per_episode ?? 5,
      description: payload.description || null,
    },
  });
}

/** AI-generate a full multi-episode project from a prompt */
export async function generateStoryboardProject(apiKey, payload) {
  return storyboardFetch('/storyboard-projects/generate', apiKey, {
    method: 'POST',
    body: withWebhook(
      {
        prompt: payload.prompt,
        num_episodes: payload.num_episodes ?? 1,
        target_duration_per_episode: payload.target_duration_per_episode ?? 5,
        sync: payload.sync ?? false,
        style: payload.style || 'cinematic realistic',
        use_pro: payload.use_pro ?? false,
        grid_mode: payload.grid_mode ?? false,
        resolution: payload.resolution || '1k',
      },
      payload.webhook_url,
    ),
  });
}

export async function getStoryboardProject(apiKey, id) {
  return storyboardFetch(`/storyboard-projects/${id}`, apiKey);
}

export async function deleteStoryboardProject(apiKey, id) {
  return storyboardFetch(`/storyboard-projects/${id}`, apiKey, {
    method: 'DELETE',
  });
}

export async function generateStoryboardLibrary(
  apiKey,
  id,
  { sync = false, webhook_url } = {},
) {
  return storyboardFetch(`/storyboard-projects/${id}/generate-library`, apiKey, {
    method: 'POST',
    body: withWebhook({ sync }, webhook_url),
  });
}

export async function generateStoryboardShots(
  apiKey,
  id,
  { sync = false, webhook_url } = {},
) {
  return storyboardFetch(`/storyboard-projects/${id}/generate-shots`, apiKey, {
    method: 'POST',
    body: withWebhook({ sync }, webhook_url),
  });
}

export async function generateStoryboardScripts(
  apiKey,
  id,
  { sync = false, webhook_url } = {},
) {
  return storyboardFetch(`/storyboard-projects/${id}/generate-scripts`, apiKey, {
    method: 'POST',
    body: withWebhook({ sync }, webhook_url),
  });
}

export async function generateStoryboardPdf(
  apiKey,
  id,
  { sync = false, webhook_url } = {},
) {
  return storyboardFetch(`/storyboard-projects/${id}/generate-pdf`, apiKey, {
    method: 'POST',
    body: withWebhook({ sync }, webhook_url),
  });
}

export async function getStoryboardPdfStatus(apiKey, id) {
  return storyboardFetch(`/storyboard-projects/${id}/pdf`, apiKey);
}

export async function getStoryboardScripts(apiKey, id) {
  return storyboardFetch(`/storyboard-projects/${id}/scripts`, apiKey);
}

export async function getStoryboardShots(apiKey, id) {
  const data = await storyboardFetch(`/storyboard-projects/${id}/shots`, apiKey);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.shots)) return data.shots;
  if (Array.isArray(data?.items)) return data.items;
  return data;
}

export async function getStoryboardLibrary(apiKey, id) {
  return storyboardFetch(`/storyboard-projects/${id}/library`, apiKey);
}

export async function addStoryboardEpisode(apiKey, payload) {
  return storyboardFetch('/storyboard-episodes/add', apiKey, {
    method: 'POST',
    body: withWebhook(
      {
        project_id: Number(payload.project_id),
        episode_index: Number(payload.episode_index),
        description: payload.description || null,
        target_duration: payload.target_duration ?? 5,
        grid_mode: payload.grid_mode ?? false,
      },
      payload.webhook_url,
    ),
  });
}

export async function addStoryboardScene(apiKey, payload) {
  return storyboardFetch('/storyboard-scenes/add', apiKey, {
    method: 'POST',
    body: withWebhook(
      {
        project_id: payload.project_id != null ? Number(payload.project_id) : null,
        episode_index:
          payload.episode_index != null ? Number(payload.episode_index) : 1,
        scene_index: Number(payload.scene_index),
        episode_id: payload.episode_id != null ? Number(payload.episode_id) : null,
        description: payload.description || null,
      },
      payload.webhook_url,
    ),
  });
}

export async function addStoryboardShot(apiKey, payload) {
  return storyboardFetch('/storyboard-shots/add', apiKey, {
    method: 'POST',
    body: withWebhook(
      {
        project_id: payload.project_id != null ? Number(payload.project_id) : null,
        episode_index:
          payload.episode_index != null ? Number(payload.episode_index) : null,
        scene_index:
          payload.scene_index != null ? Number(payload.scene_index) : null,
        scene_id: payload.scene_id != null ? Number(payload.scene_id) : null,
        shot_index: Number(payload.shot_index),
        description: payload.description || null,
      },
      payload.webhook_url,
    ),
  });
}

export async function regenerateStoryboardShot(apiKey, shotId, payload = {}) {
  return storyboardFetch(`/storyboard-shots/${shotId}/regenerate`, apiKey, {
    method: 'POST',
    body: withWebhook(
      {
        description: payload.description || null,
      },
      payload.webhook_url,
    ),
  });
}

export async function regenerateStoryboardCharacter(
  apiKey,
  characterId,
  description,
  { webhook_url } = {},
) {
  return storyboardFetch(
    `/storyboard-characters/${characterId}/regenerate`,
    apiKey,
    {
      method: 'POST',
      body: withWebhook({ description }, webhook_url),
    },
  );
}

/** Pull a downloadable URL out of PDF / scripts poll payloads */
export function extractExportUrl(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.url,
    payload.pdf_url,
    payload.download_url,
    payload.file_url,
    payload.output_url,
    payload.result?.url,
    payload.pdf?.url,
    payload.data?.url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^https?:\/\//i.test(c)) return c;
  }
  return null;
}

export function extractExportStatus(payload) {
  if (!payload || typeof payload !== 'object') return 'unknown';
  return (
    payload.status ||
    payload.state ||
    payload.pdf_status ||
    payload.progress_status ||
    'unknown'
  );
}

/** Normalize nested project → flat shot cards for the grid */
export function flattenStoryboardShots(projectOrShots) {
  if (!projectOrShots) return [];
  if (Array.isArray(projectOrShots)) {
    return projectOrShots.map(normalizeShot).filter(Boolean);
  }

  const shots = [];
  const episodes =
    projectOrShots.episodes ||
    projectOrShots.project?.episodes ||
    [];

  for (const ep of episodes) {
    const scenes = ep.scenes || [];
    for (const scene of scenes) {
      for (const shot of scene.shots || []) {
        shots.push(
          normalizeShot({
            ...shot,
            episode_index: ep.episode_index ?? ep.index ?? ep.number,
            scene_index: scene.scene_index ?? scene.index ?? scene.number,
            episode_title: ep.title || ep.name,
            scene_title: scene.title || scene.name || scene.location,
          }),
        );
      }
    }
  }

  if (!shots.length && Array.isArray(projectOrShots.shots)) {
    return projectOrShots.shots.map(normalizeShot).filter(Boolean);
  }

  return shots;
}

function normalizeShot(shot) {
  if (!shot || typeof shot !== 'object') return null;
  const image =
    shot.image_url ||
    shot.image ||
    shot.output_url ||
    shot.url ||
    shot.thumbnail_url ||
    shot.outputs?.[0] ||
    null;
  return {
    id: shot.id ?? shot.shot_id,
    description: shot.description || shot.prompt || shot.visual_description || '',
    image_url: typeof image === 'string' ? image : image?.url || null,
    status: shot.status || 'unknown',
    camera: shot.camera || shot.camera_angle || shot.shot_type || '',
    episode_index: shot.episode_index,
    scene_index: shot.scene_index,
    shot_index: shot.shot_index ?? shot.index,
    episode_title: shot.episode_title,
    scene_title: shot.scene_title,
    raw: shot,
  };
}

export function extractLibraryCharacters(library) {
  if (!library) return [];
  const list =
    library.characters ||
    library.library?.characters ||
    library.items ||
    (Array.isArray(library) ? library : []);
  return list.map((c) => ({
    id: c.id ?? c.character_id,
    name: c.name || c.title || 'Character',
    description: c.description || c.traits || '',
    image_url:
      c.image_url ||
      c.reference_image ||
      c.thumbnail_url ||
      c.images?.[0] ||
      null,
    raw: c,
  }));
}

export function extractEpisodes(project) {
  if (!project) return [];
  const episodes = project.episodes || project.project?.episodes || [];
  if (!Array.isArray(episodes)) return [];
  return episodes.map((ep, i) => ({
    id: ep.id ?? ep.episode_id,
    index: ep.episode_index ?? ep.index ?? ep.number ?? i + 1,
    title: ep.title || ep.name || `Episode ${i + 1}`,
    sceneCount: Array.isArray(ep.scenes) ? ep.scenes.length : 0,
    raw: ep,
  }));
}

export { uploadFile };
