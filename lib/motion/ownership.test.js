import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertOwnedGenerationRows, validateOutputUpload } from './validation.js';

describe('motion ownership rejection', () => {
  const user = 'u1';

  it('rejects foreign generation ids', () => {
    assert.throws(
      () =>
        assertOwnedGenerationRows(
          user,
          [{ id: 'g1', userId: 'other', muapiRequestId: null }],
          ['g1']
        ),
      (e) => e.status === 403
    );
  });

  it('accepts owned id or muapiRequestId', () => {
    const rows = [
      { id: 'g1', userId: user, muapiRequestId: 'req-9' },
    ];
    assert.equal(assertOwnedGenerationRows(user, rows, ['g1']).length, 1);
    assert.equal(assertOwnedGenerationRows(user, rows, ['req-9']).length, 1);
  });
});

describe('output upload validation', () => {
  it('rejects bad type/size', () => {
    assert.throws(
      () => validateOutputUpload({ filename: 'x.exe', sizeBytes: 1 }),
      /Unsupported/
    );
    assert.throws(
      () =>
        validateOutputUpload({
          filename: 'x.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 600 * 1024 * 1024,
        }),
      /too large/
    );
  });
});
