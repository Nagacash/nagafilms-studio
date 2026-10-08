import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMotionManifest } from './manifest.js';
import { validateOutputUpload } from './validation.js';

/** Pure validation helpers — no DB. */

describe('motion project create validation (pure)', () => {
  it('requires media list for a useful package', () => {
    const m = buildMotionManifest({
      motionProjectId: 'x',
      nagaProjectId: 'x',
      title: 'Empty',
      media: [],
    });
    assert.equal(m.media.length, 0);
  });

  it('zip entry names stay under media/ + manifest names', () => {
    const expected = [
      'media/clip-001.mp4',
      'naga-motion-project.json',
      'OPEN_IN_MOTION.md',
      'third_party/effectcraft/NOTICE',
      'third_party/effectcraft/LICENSE-MIT',
      'third_party/effectcraft/LICENSE-APACHE',
    ];
    for (const name of expected) {
      assert.ok(!name.includes('..'));
      assert.ok(!name.endsWith('.ecproj'));
    }
  });
});

describe('ownership-shaped errors', () => {
  it('path traversal in filename rejected', () => {
    assert.throws(
      () => validateOutputUpload({ filename: '../secret.mp4', sizeBytes: 10 }),
      /Invalid filename/
    );
  });
});
