import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionForUrl,
  firstResultUrl,
  kindFromGeneration,
} from './asset-utils.js';

describe('editor project helpers', () => {
  it('extracts first result URL from array or object', () => {
    assert.equal(firstResultUrl({ resultUrls: ['https://x/a.mp4'] }), 'https://x/a.mp4');
    assert.equal(firstResultUrl({ resultUrls: { 0: 'https://x/b.mp4' } }), 'https://x/b.mp4');
    assert.equal(firstResultUrl({ resultUrls: [] }), null);
  });

  it('maps modality to asset kind', () => {
    assert.equal(kindFromGeneration({ modality: 'image' }), 'image');
    assert.equal(kindFromGeneration({ modality: 'audio' }), 'audio');
    assert.equal(kindFromGeneration({ modality: 'video' }), 'video');
    assert.equal(
      kindFromGeneration({
        modality: 'generation',
        resultUrls: ['https://cdn.example/out/still.png'],
      }),
      'image'
    );
    assert.equal(
      kindFromGeneration({ modality: 'generation', model: 'flux-dev' }),
      'image'
    );
  });

  it('picks extension from URL with fallbacks', () => {
    assert.equal(extensionForUrl('https://cdn.example/out/clip.webm', 'video'), 'webm');
    assert.equal(extensionForUrl('https://cdn.example/out/noext', 'video'), 'mp4');
    assert.equal(extensionForUrl('https://cdn.example/out/x', 'image'), 'png');
  });
});
