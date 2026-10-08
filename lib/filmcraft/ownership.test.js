import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure ownership / validation rules used by API layer
 * (mirrored here so we don't need a live DB for unit tests).
 */
function assertOwnedGenerations(userId, rows, requestedIds) {
  if (!requestedIds?.length) {
    const err = new Error('generationIds required');
    err.status = 400;
    throw err;
  }
  if (rows.length !== requestedIds.length) {
    const err = new Error('One or more generations not found or not owned');
    err.status = 403;
    throw err;
  }
  for (const row of rows) {
    if (row.userId !== userId) {
      const err = new Error('One or more generations not found or not owned');
      err.status = 403;
      throw err;
    }
    if (row.status !== 'completed') {
      const err = new Error(`Generation ${row.id} is not completed`);
      err.status = 400;
      throw err;
    }
    if (!row.resultUrls?.length) {
      const err = new Error(`Generation ${row.id} has no result URL`);
      err.status = 400;
      throw err;
    }
  }
  return true;
}

describe('ownership validation', () => {
  const user = 'u1';

  it('rejects empty generation list', () => {
    assert.throws(() => assertOwnedGenerations(user, [], []), (e) => e.status === 400);
  });

  it('rejects missing / foreign generations', () => {
    assert.throws(
      () =>
        assertOwnedGenerations(user, [{ id: 'a', userId: user, status: 'completed', resultUrls: ['x'] }], [
          'a',
          'b',
        ]),
      (e) => e.status === 403
    );
  });

  it('rejects incomplete generations', () => {
    assert.throws(
      () =>
        assertOwnedGenerations(
          user,
          [{ id: 'a', userId: user, status: 'pending', resultUrls: ['x'] }],
          ['a']
        ),
      (e) => e.status === 400
    );
  });

  it('accepts owned completed gens with URLs', () => {
    assert.equal(
      assertOwnedGenerations(
        user,
        [{ id: 'a', userId: user, status: 'completed', resultUrls: ['https://x'] }],
        ['a']
      ),
      true
    );
  });
});
