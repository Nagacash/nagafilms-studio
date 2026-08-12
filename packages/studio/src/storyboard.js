import { uploadFile } from './muapi.js';
import { emitWalletUpdate, parseNagaWalletPayload } from './walletEvents.js';
export {
  STORYBOARD_USD_ESTIMATES,
  defaultPricingConfig,
  usdToCredits,
  estimateStoryboardCredits,
} from './storyboard-pricing.js';

const V1_URL = typeof window !== 'undefined' ? '/api/v1' : 'https://api.muapi.ai/api/v1';

export function isActiveStoryboardStatus(status) {
  const s = String(status || '').toLowerCase();
  if (!s) return false;
  if (/(fail|error|cancel|complete|ready|succeed|done|idle|draft)/.test(s)) {
    return false;
  }
  return /(process|generat|queue|pending|runn|progress|start|creat|wait)/.test(s);
}

/** Best-effort progress 0–100 from MuAPI payloads */
export function extractProgressPercent(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.progress,
    payload.percent,
    payload.percentage,
    payload.progress_percent,
    payload.progressPercent,
    payload.meta?.progress,
    payload.data?.progress,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (!Number.isFinite(n)) continue;
    if (n >= 0 && n <= 1) return Math.round(n * 100);
    if (n >= 0 && n <= 100) return Math.round(n);
  }
  return null;
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
    if (response.status === 402) {
      const cost = data?.costCredits ?? data?.naga?.costCredits;
      const wallet = parseNagaWalletPayload(data);
      if (wallet) emitWalletUpdate(wallet);
      throw new Error(
        data?.error ||
          `Insufficient credits${cost ? ` (~${cost} cr needed)` : ''}. Buy a pack to continue.`,
      );
    }
    if (response.status === 429) {
      throw new Error(
        data?.error || 'Too many in-flight storyboard jobs. Wait for one to finish.',
      );
    }
    if (response.status === 410) {
      throw new Error(data?.error || 'This storyboard feature is not offered.');
    }
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
  const wallet = parseNagaWalletPayload(data);
  if (wallet) emitWalletUpdate(wallet);
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

/** Pull a downloadable URL out of PDF poll payloads */
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
    progress: extractProgressPercent(shot),
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
