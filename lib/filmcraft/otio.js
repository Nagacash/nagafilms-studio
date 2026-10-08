/**
 * Build a minimal OpenTimelineIO Timeline JSON document.
 * FilmCraft documents OTIO as an importable interchange format
 * (README Interchange / crates/interchange). Media paths are relative
 * to the package root (e.g. media/clip-001.mp4).
 */

function rationalRange(startFrame, durationFrames, rate) {
  return {
    OTIO_SCHEMA: 'TimeRange.1',
    start_time: {
      OTIO_SCHEMA: 'RationalTime.1',
      value: startFrame,
      rate,
    },
    duration: {
      OTIO_SCHEMA: 'RationalTime.1',
      value: durationFrames,
      rate,
    },
  };
}

/**
 * @param {{ name: string, clips: Array<{ name: string, relativePath: string, durationMs?: number|null }> }} opts
 */
export function buildOtioTimeline({ name, clips, rate = 24 }) {
  const children = [];
  let cursor = 0;

  for (const clip of clips) {
    const ms = Number(clip.durationMs) > 0 ? Number(clip.durationMs) : 5000;
    const durationFrames = Math.max(1, Math.round((ms / 1000) * rate));
    const available = rationalRange(0, durationFrames, rate);
    children.push({
      OTIO_SCHEMA: 'Clip.1',
      name: clip.name,
      source_range: available,
      media_reference: {
        OTIO_SCHEMA: 'ExternalReference.1',
        name: clip.name,
        target_url: clip.relativePath,
        available_range: available,
      },
    });
    cursor += durationFrames;
  }

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: name || 'Naga Films edit',
    global_start_time: {
      OTIO_SCHEMA: 'RationalTime.1',
      value: 0,
      rate,
    },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'tracks',
      children: [
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'V1',
          kind: 'Video',
          children,
        },
      ],
    },
    metadata: {
      naga_films: {
        source: 'filmcraft-handoff',
        clip_count: clips.length,
        total_frames: cursor,
      },
    },
  };
}
