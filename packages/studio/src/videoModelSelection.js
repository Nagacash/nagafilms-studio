import {
  t2vModels,
  i2vModels,
  getI2VModelById,
  getVideoModelById,
} from "./models.js";

/** Default I2V when user uploads an image without a matching model — never Seedance VIP. */
export const DEFAULT_I2V_ON_UPLOAD = "wan2.5-image-to-video-fast";

export const PREMIUM_I2V_IDS = new Set([
  "seedance-2-vip-omni-reference",
  "sd-2-vip-omni-reference-1080p",
]);

export function isI2vModelId(id) {
  return i2vModels.some((m) => m.id === id);
}

export function isT2vModelId(id) {
  return t2vModels.some((m) => m.id === id);
}

export function isLiveI2vModel(m) {
  return m?.category === "Image to Video" || isI2vModelId(m?.id);
}

export function isLiveT2vModel(m) {
  return m?.category === "Text to Video" || isT2vModelId(m?.id);
}

export function resolveModelEndpoint(modelId, { imageMode, liveModel } = {}) {
  if (liveModel?.endpoint) return liveModel.endpoint;
  const meta = imageMode ? getI2VModelById(modelId) : getVideoModelById(modelId);
  return meta?.endpoint || modelId;
}

export function modelIsSupportedInStudio(m, fallbackModels = []) {
  if (!m) return false;
  if (m.hasStaticMeta === true) return true;
  return fallbackModels.some((f) => f.id === m.id);
}

export function filterSupportedModels(models, fallbackModels = []) {
  return models.filter((m) => modelIsSupportedInStudio(m, fallbackModels));
}

/**
 * When the user adds a start frame, enable image-to-video mode without silently
 * picking an expensive omni model.
 */
export function pickI2vTargetOnImageUpload(selectedModel) {
  if (isI2vModelId(selectedModel)) {
    const m = i2vModels.find((x) => x.id === selectedModel);
    return {
      modelId: selectedModel,
      modelName: m.name,
      endpoint: m.endpoint,
      switched: false,
    };
  }

  const t2v = t2vModels.find((m) => m.id === selectedModel);
  if (t2v?.family) {
    const sibling = i2vModels.find((m) => m.family === t2v.family);
    if (sibling) {
      return {
        modelId: sibling.id,
        modelName: sibling.name,
        endpoint: sibling.endpoint,
        switched: true,
        reason: `Switched to ${sibling.name} — the image-to-video pair for ${t2v.name}. You can pick another model before generating.`,
      };
    }
  }

  const fallback =
    i2vModels.find((m) => m.id === DEFAULT_I2V_ON_UPLOAD) ||
    i2vModels.find(
      (m) => !m.supportsCharacterTags && !PREMIUM_I2V_IDS.has(m.id),
    ) ||
    i2vModels[0];

  return {
    modelId: fallback.id,
    modelName: fallback.name,
    endpoint: fallback.endpoint,
    switched: true,
    reason: `Image-to-video mode enabled with ${fallback.name}. Open the model picker to choose your model before generating.`,
  };
}

export function isPremiumI2vModel(modelId) {
  return PREMIUM_I2V_IDS.has(modelId);
}
