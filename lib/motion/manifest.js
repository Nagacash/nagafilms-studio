/**
 * Build naga-motion-project.json for EffectCraft desktop handoff.
 * Does not invent .ecproj — EffectCraft imports media manually in v1.
 */
export function buildMotionManifest(input) {
  const media = (input.media || []).map((m, i) => ({
    id: m.id || `media-${i + 1}`,
    filename: m.filename,
    relativePath: m.relativePath || `media/${m.filename}`,
    kind: m.kind || 'video',
    sourceUrl: m.sourceUrl || null,
    durationMs: m.durationMs ?? null,
    width: m.width ?? null,
    height: m.height ?? null,
    fps: m.fps ?? null,
    inPointMs: m.inPointMs ?? null,
    outPointMs: m.outPointMs ?? null,
  }));

  return {
    schemaVersion: 1,
    type: 'naga-motion-project',
    motionProjectId: input.motionProjectId,
    nagaProjectId: input.nagaProjectId,
    editorProjectId: input.editorProjectId || null,
    sourceAssetId: input.sourceAssetId || null,
    sourceTimelineClipId: input.sourceTimelineClipId || null,
    sourceGenerationId: input.sourceGenerationId || null,
    title: input.title || 'Motion project',
    createdAt: input.createdAt || new Date().toISOString(),
    recommended: {
      width: input.width ?? null,
      height: input.height ?? null,
      fps: input.fps ?? 24,
      durationMs: input.durationMs ?? null,
      exportNotes:
        input.exportNotes ||
        'Render from EffectCraft, then upload the finished file back to Naga via Import Motion Render.',
    },
    media,
    returnSteps: [
      'Unzip this package on your machine.',
      'Open EffectCraft desktop and import files from media/.',
      'Design and render your Motion & VFX pass.',
      'In Naga, open this Motion project and use Import Motion Render.',
      'Use Add to Film Timeline to attach the render to your Film Editor project (when linked).',
    ],
  };
}

export function openInMotionMarkdown(title) {
  return [
    `# ${title} — Motion & VFX handoff`,
    '',
    'This package was created by Naga Films Studio for Motion & VFX work.',
    'Desktop tool: EffectCraft (open source). Naga does not auto-launch EffectCraft.',
    '',
    '## Steps',
    '',
    '1. Install EffectCraft desktop (see upstream releases / docs).',
    '2. Unzip this package.',
    '3. In EffectCraft: File → Import (or drag) the files under `media/`.',
    '4. Design and render your pass.',
    '5. Return to Naga → this Motion project → **Import Motion Render**.',
    '6. Optionally **Add to Film Timeline** to attach the render to your Film Editor project.',
    '',
    'See `naga-motion-project.json` for IDs and recommended export settings.',
    '',
    'Licenses for EffectCraft are under `third_party/effectcraft/`.',
    '',
  ].join('\n');
}
