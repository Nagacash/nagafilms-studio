import {
  ALLOWED_OUTPUT_EXT,
  ALLOWED_OUTPUT_MIME,
  MAX_OUTPUT_BYTES,
} from './config.js';
import { formatFromFilename } from './asset-utils.js';

export function validateOutputUpload({ filename, mimeType, sizeBytes }) {
  const name = String(filename || '').trim();
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    const err = new Error('Invalid filename');
    err.status = 400;
    throw err;
  }

  const ext = formatFromFilename(name);
  if (!ALLOWED_OUTPUT_EXT.has(ext)) {
    const err = new Error(`Unsupported file type: .${ext}`);
    err.status = 400;
    throw err;
  }

  if (mimeType && !ALLOWED_OUTPUT_MIME.has(String(mimeType).toLowerCase())) {
    if (String(mimeType).toLowerCase() !== 'application/octet-stream') {
      const err = new Error(`Unsupported MIME type: ${mimeType}`);
      err.status = 400;
      throw err;
    }
  }

  if (sizeBytes != null && sizeBytes > MAX_OUTPUT_BYTES) {
    const err = new Error(`File too large (max ${MAX_OUTPUT_BYTES} bytes)`);
    err.status = 400;
    throw err;
  }

  return { filename: name, format: ext };
}

/** Pure ownership check for unit tests / API preflight. */
export function assertOwnedGenerationRows(userId, rows, requestedIds) {
  if (!requestedIds?.length) {
    const err = new Error('generationIds required');
    err.status = 400;
    throw err;
  }
  const byKey = new Map();
  for (const row of rows) {
    byKey.set(row.id, row);
    if (row.muapiRequestId) byKey.set(String(row.muapiRequestId), row);
  }
  const ordered = [];
  const seen = new Set();
  for (const id of requestedIds) {
    const row = byKey.get(id);
    if (!row || row.userId !== userId || seen.has(row.id)) {
      const err = new Error('One or more generations not found or not owned');
      err.status = 403;
      throw err;
    }
    seen.add(row.id);
    ordered.push(row);
  }
  return ordered;
}
