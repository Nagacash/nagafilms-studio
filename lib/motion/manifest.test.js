import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMotionManifest, openInMotionMarkdown } from './manifest.js';
import { getHandoffMode, getEffectCraftMode } from './config.js';
import { validateOutputUpload } from './validation.js';

describe('motion manifest', () => {
  it('builds naga-motion-project.json fields and media paths', () => {
    const m = buildMotionManifest({
      motionProjectId: 'mp-1',
      nagaProjectId: 'np-1',
      editorProjectId: 'ep-1',
      title: 'Test Motion',
      media: [
        {
          id: 'a1',
          filename: 'clip-001.mp4',
          relativePath: 'media/clip-001.mp4',
          kind: 'video',
          durationMs: 2500,
        },
      ],
      fps: 24,
      width: 1920,
      height: 1080,
    });

    assert.equal(m.type, 'naga-motion-project');
    assert.equal(m.schemaVersion, 1);
    assert.equal(m.motionProjectId, 'mp-1');
    assert.equal(m.media[0].relativePath, 'media/clip-001.mp4');
    assert.ok(Array.isArray(m.returnSteps));
    assert.ok(m.returnSteps.length >= 3);
  });

  it('OPEN_IN_MOTION.md names Motion & VFX, not ArtCraft', () => {
    const md = openInMotionMarkdown('Clip A');
    assert.match(md, /Motion & VFX/);
    assert.doesNotMatch(md, /ArtCraft/i);
  });
});

describe('effectcraft mode fallback', () => {
  it('handoff mode is download when web flag off', () => {
    const prev = process.env.EFFECTCRAFT_WEB_ENABLED;
    const prevPub = process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED;
    delete process.env.EFFECTCRAFT_WEB_ENABLED;
    delete process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED;
    assert.equal(getHandoffMode(), 'download');
    const mode = getEffectCraftMode();
    assert.ok(['download', 'local', 'web'].includes(mode));
    if (prev !== undefined) process.env.EFFECTCRAFT_WEB_ENABLED = prev;
    if (prevPub !== undefined) process.env.NEXT_PUBLIC_EFFECTCRAFT_WEB_ENABLED = prevPub;
  });
});

describe('output validation', () => {
  it('rejects bad extension and oversized files', () => {
    assert.throws(
      () => validateOutputUpload({ filename: 'evil.exe', mimeType: 'application/octet-stream', sizeBytes: 10 }),
      /Unsupported file type/
    );
    assert.throws(
      () =>
        validateOutputUpload({
          filename: 'big.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 600 * 1024 * 1024,
        }),
      /too large/
    );
  });

  it('accepts mp4 and png', () => {
    const a = validateOutputUpload({
      filename: 'render.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });
    assert.equal(a.format, 'mp4');
    const b = validateOutputUpload({
      filename: 'alpha.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
    });
    assert.equal(b.format, 'png');
  });
});
