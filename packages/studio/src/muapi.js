import { getModelById, getVideoModelById, getI2IModelById, getI2VModelById, getV2VModelById, getLipSyncModelById } from './models.js';
import { emitWalletUpdate, parseNagaWalletPayload } from './walletEvents.js';

const BASE_URL = typeof window !== 'undefined' ? '/api' : 'https://api.muapi.ai';
/** Browser: /api/v1 → middleware rewrites to api.muapi.ai (NOT /api/api/v1 — that path is only for legacy double-api proxy). */
const V1_URL = typeof window !== 'undefined' ? '/api/v1' : 'https://api.muapi.ai/api/v1';

/**
 * MuAPI is reached via same-origin rewrite (/api/v1, …). BYO key mode omits
 * cookies (large dev cookies can trigger upstream 400). Session SaaS mode
 * sends cookies so the server proxy can attach MUAPI_API_KEY + credit checks.
 */
function apiFetch(url, init = {}, apiKey) {
    const next = { ...init };
    if (typeof window !== 'undefined') {
        next.credentials =
            apiKey === 'session' ? 'include' : (init.credentials ?? 'omit');
    }
    return fetch(url, next);
}

function normalizeBalancePayload(data) {
    const balance =
        data?.balance ??
        data?.credits ??
        data?.amount ??
        data?.data?.balance ??
        null;
    return {
        balance,
        currency: data?.currency || 'USD',
        raw: data,
    };
}

async function pollForResult(requestId, key, maxAttempts = 900, interval = 2000) {
    const pollUrl = `${V1_URL}/predictions/${requestId}/result`;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        try {
            const response = await apiFetch(pollUrl, {
                headers: { 'Content-Type': 'application/json', 'x-api-key': key }
            }, key);
            if (!response.ok) {
                const errText = await response.text();
                if (response.status >= 500) continue;
                throw new Error(`Poll Failed: ${response.status} - ${errText.slice(0, 100)}`);
            }
            const data = await response.json();
            const wallet = parseNagaWalletPayload(data);
            if (wallet) emitWalletUpdate(wallet);
            const status = data.status?.toLowerCase();
            if (status === 'completed' || status === 'succeeded' || status === 'success') return data;
            if (status === 'failed' || status === 'error') throw new Error(`Generation failed: ${data.error || 'Unknown error'}`);
        } catch (error) {
            if (attempt === maxAttempts) throw error;
        }
    }
    throw new Error('Generation timed out after polling.');
}

async function submitAndPoll(endpoint, payload, key, onRequestId, maxAttempts = 60) {
    const url = `${V1_URL}/${endpoint}`;
    const response = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify(payload)
    }, key);
    if (!response.ok) {
        const errText = await response.text();
        try {
            const errJson = JSON.parse(errText);
            const wallet = parseNagaWalletPayload(errJson);
            if (wallet) emitWalletUpdate(wallet);
        } catch { /* plain text error */ }
        throw new Error(`API Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0, 100)}`);
    }
    const submitData = await response.json();
    const submitWallet = parseNagaWalletPayload(submitData);
    if (submitWallet) emitWalletUpdate(submitWallet);
    const requestId = submitData.request_id || submitData.id;
    if (!requestId) return submitData;
    if (onRequestId) onRequestId(requestId);
    const result = await pollForResult(requestId, key, maxAttempts);
    const outputUrl = result.outputs?.[0] || result.url || result.output?.url;
    const characterId =
      result.character_id ||
      result.char_id ||
      result.output?.character_id ||
      result.outputs?.find?.((o) => typeof o === 'string' && o.startsWith('char_')) ||
      null;
    return { ...result, url: outputUrl, id: requestId, request_id: requestId, character_id: characterId };
}

export async function generateImage(apiKey, params) {
    const modelInfo = getModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = { prompt: params.prompt };
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.image_url) { 
        payload.image_url = params.image_url; 
        payload.strength = params.strength || 0.6; 
    } else if (params.images_list) {
        payload.images_list = params.images_list;
    } else {
        payload.image_url = null;
    }
    if (params.seed && params.seed !== -1) payload.seed = params.seed;
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 60);
}

export async function generateI2I(apiKey, params) {
    const modelInfo = getI2IModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.prompt) payload.prompt = params.prompt;
    const imageField = modelInfo?.imageField || 'image_url';
    const imagesList = params.images_list?.length > 0 ? params.images_list : (params.image_url ? [params.image_url] : null);
    if (imagesList) {
        if (imageField === 'images_list') payload.images_list = imagesList;
        else payload[imageField] = imagesList[0];
    }
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 60);
}

export async function generateVideo(apiKey, params) {
    const modelInfo = getVideoModelById(params.model);
    const endpoint = params.endpoint || modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.prompt) payload.prompt = params.prompt;
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.duration) payload.duration = params.duration;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.mode) payload.mode = params.mode;
    if (params.image_url) payload.image_url = params.image_url;
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 900);
}

export async function generateI2V(apiKey, params) {
    const modelInfo = getI2VModelById(params.model);
    const endpoint = params.endpoint || modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.prompt) payload.prompt = params.prompt;
    const imageField = modelInfo?.imageField || 'image_url';

    const imageList = Array.isArray(params.images_list)
      ? params.images_list.filter(Boolean)
      : params.image_url
        ? [params.image_url]
        : [];

    if (imageList.length) {
      if (imageField === 'images_list') payload.images_list = imageList;
      else payload[imageField] = imageList[0];
    }

    const lastImageField = modelInfo?.lastImageField;
    if (lastImageField && params.last_image) {
        payload[lastImageField] = params.last_image;
    }
    if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio;
    if (params.duration) payload.duration = params.duration;
    if (params.resolution) payload.resolution = params.resolution;
    if (params.quality) payload.quality = params.quality;
    if (params.mode) payload.mode = params.mode;
    if (params.character_name) payload.character_name = params.character_name;
    if (params.description) payload.description = params.description;
    if (Array.isArray(params.video_files) && params.video_files.length) {
      payload.video_files = params.video_files;
    }
    if (Array.isArray(params.audio_files) && params.audio_files.length) {
      payload.audio_files = params.audio_files;
    }
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 900);
}

/** Build a reusable Seedance 2 character sheet → use @character:<request_id> later */
export async function createCharacterSheet(apiKey, params) {
    const payload = {
        prompt: params.prompt || 'character sheet, neutral pose, consistent identity',
        images_list: params.images_list || [],
    };
    if (params.character_name) payload.character_name = params.character_name;
    return submitAndPoll('seedance-2-character', payload, apiKey, params.onRequestId, 900);
}

/** Train Omni / Kinovi identity → use @omni-character:<char_id> later */
export async function trainOmniCharacter(apiKey, params) {
    const payload = {
        image_url: params.image_url,
        character_name: params.character_name || 'Character',
    };
    if (params.description) payload.description = params.description;
    return submitAndPoll('seedance-2-omni-reference-train', payload, apiKey, params.onRequestId, 900);
}

export async function generateMarketingStudioAd(apiKey, params) {
    const endpoint = params.resolution === '1080p' ? 'sd-2-vip-omni-reference-1080p' : 'seedance-2-vip-omni-reference';
    const payload = {
        prompt: params.prompt,
        aspect_ratio: params.aspect_ratio || '16:9',
        duration: params.duration || 5,
        images_list: params.images_list || [],
        video_files: params.video_files || []
    };
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 900);
}

export async function processV2V(apiKey, params) {
    const modelInfo = getV2VModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const videoField = modelInfo?.videoField || 'video_url';
    const payload = { [videoField]: params.video_url };
    if (modelInfo?.imageField && params.image_url) {
        payload[modelInfo.imageField] = params.image_url;
    }
    if (modelInfo?.hasPrompt && params.prompt) {
        payload.prompt = params.prompt;
    }
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 900);
}

export async function processLipSync(apiKey, params) {
    const modelInfo = getLipSyncModelById(params.model);
    const endpoint = modelInfo?.endpoint || params.model;
    const payload = {};
    if (params.audio_url) payload.audio_url = params.audio_url;
    if (params.image_url) payload.image_url = params.image_url;
    if (params.video_url) payload.video_url = params.video_url;
    if (modelInfo?.hasPrompt) payload.prompt = params.prompt || '';
    if (params.resolution) payload.resolution = params.resolution;
    if (params.seed !== undefined && params.seed !== -1) payload.seed = params.seed;
    return submitAndPoll(endpoint, payload, apiKey, params.onRequestId, 900);
}

export function uploadFile(apiKey, file, onProgress) {
    return new Promise((resolve, reject) => {
        const url = `${V1_URL}/upload_file`;
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.withCredentials = apiKey === 'session';
        xhr.setRequestHeader('x-api-key', apiKey);

        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    const fileUrl = data.url || data.file_url || data.data?.url;
                    if (!fileUrl) {
                        reject(new Error('No URL returned from file upload'));
                    } else {
                        resolve(fileUrl);
                    }
                } catch (e) {
                    reject(new Error('Failed to parse upload response'));
                }
            } else {
                let detail = xhr.statusText;
                try {
                    const errObj = JSON.parse(xhr.responseText);
                    detail = errObj.detail || detail;
                } catch (e) {
                    // fallback to statusText
                }
                reject(new Error(`File upload failed: ${xhr.status} - ${detail}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during file upload'));
        xhr.send(formData);
    });
}

export async function getUserBalance(apiKey) {
    const response = await apiFetch(`${V1_URL}/account/balance`, {
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        }
    }, apiKey);
    const raw = await response.text();
    if (!response.ok) {
        const snippet = raw.slice(0, 120).replace(/\s+/g, ' ');
        throw new Error(`Failed to fetch balance: ${response.status} - ${snippet}`);
    }
    try {
        return normalizeBalancePayload(JSON.parse(raw));
    } catch {
        throw new Error('Failed to fetch balance: response was not JSON');
    }
}
