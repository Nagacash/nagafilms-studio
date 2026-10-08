import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure ownership / validation rules used by API layer
 * (mirrored here so we don't need a live DB for unit tests).
 * requestedIds may be generations.id or muapiRequestId.
 */
function assertOwnedGenerations(userId, rows, requestedIds) {
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
  for (const row of ordered) {
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

  it('accepts lookup by muapiRequestId', () => {
    assert.equal(
      assertOwnedGenerations(
        user,
        [
          {
            id: 'db-1',
            userId: user,
            muapiRequestId: 'req-1',
            status: 'completed',
            resultUrls: ['https://x'],
          },
        ],
        ['req-1']
      ),
      true
    );
  });
});
