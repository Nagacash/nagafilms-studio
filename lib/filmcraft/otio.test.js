import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOtioTimeline } from './otio.js';
import { buildZipStore } from './zip-store.js';
import { getFilmCraftMode } from './config.js';

describe('buildOtioTimeline', () => {
  it('builds a FilmCraft-importable OTIO document with relative media paths', () => {
    const doc = buildOtioTimeline({
      name: 'Test edit',
      rate: 24,
      clips: [
        { name: 'a', relativePath: 'media/clip-001.mp4', durationMs: 2000 },
        { name: 'b', relativePath: 'media/clip-002.mp4', durationMs: 3000 },
      ],
    });

    assert.equal(doc.OTIO_SCHEMA, 'Timeline.1');
    assert.equal(doc.name, 'Test edit');
    const track = doc.tracks.children[0];
    assert.equal(track.kind, 'Video');
    assert.equal(track.children.length, 2);
    assert.equal(track.children[0].media_reference.target_url, 'media/clip-001.mp4');
    assert.equal(track.children[0].source_range.duration.value, 48);
    assert.equal(track.children[1].source_range.duration.value, 72);
  });

  it('defaults missing duration to 5s', () => {
    const doc = buildOtioTimeline({
      name: 'x',
      clips: [{ name: 'a', relativePath: 'media/a.mp4' }],
    });
    assert.equal(doc.tracks.children[0].children[0].source_range.duration.value, 120);
  });
});

describe('buildZipStore', () => {
  it('writes a zip with expected entries', () => {
    const buf = buildZipStore([
      { name: 'timeline.otio', data: '{"OTIO_SCHEMA":"Timeline.1"}' },
      { name: 'media/clip-001.mp4', data: Buffer.from([0, 1, 2, 3]) },
    ]);
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 40);
    assert.equal(buf.readUInt32LE(0), 0x04034b50);
  });
});

describe('getFilmCraftMode', () => {
  it('defaults to download and rejects unknown modes', () => {
    const prev = process.env.FILMCRAFT_MODE;
    delete process.env.FILMCRAFT_MODE;
    assert.equal(getFilmCraftMode(), 'download');
    process.env.FILMCRAFT_MODE = 'nope';
    assert.equal(getFilmCraftMode(), 'download');
    process.env.FILMCRAFT_MODE = 'cli';
    assert.equal(getFilmCraftMode(), 'cli');
    if (prev == null) delete process.env.FILMCRAFT_MODE;
    else process.env.FILMCRAFT_MODE = prev;
  });
});
