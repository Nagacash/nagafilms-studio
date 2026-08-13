"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listStoryboardProjects,
  createStoryboardProject,
  getStoryboardProject,
  deleteStoryboardProject,
  generateStoryboardLibrary,
  generateStoryboardShots,
  generateStoryboardPdf,
  getStoryboardPdfStatus,
  getStoryboardShots,
  getStoryboardLibrary,
  addStoryboardEpisode,
  addStoryboardScene,
  addStoryboardShot,
  regenerateStoryboardShot,
  regenerateStoryboardCharacter,
  flattenStoryboardShots,
  extractLibraryCharacters,
  extractEpisodes,
  extractExportUrl,
  extractExportStatus,
  extractProgressPercent,
  estimateStoryboardCredits,
  isActiveStoryboardStatus,
  defaultPricingConfig,
} from "../storyboard.js";

const PERSIST_KEY = "naga_storyboard_studio_v1";
const POLL_MS = 3500;

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary,#00ff88)]";

const fieldClass = `w-full rounded-none border border-[var(--border-color,rgba(255,255,255,0.1))] bg-white/5 outline-none focus:border-[var(--border-primary,rgba(0,255,136,0.25))] ${focusRing}`;

const btnGhost = `inline-flex min-h-11 items-center justify-center gap-2 rounded-none border border-[var(--border-color,rgba(255,255,255,0.1))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white/60 transition-colors hover:border-[var(--border-primary)] hover:text-[var(--color-primary,#00ff88)] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

const btnPrimary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-none bg-[var(--color-primary,#00ff88)] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-black transition-colors hover:bg-[var(--color-primary-hover,#33ffa3)] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

const panelClass =
  "rounded-none border border-[var(--border-color,rgba(255,110,199,0.12))] bg-[var(--bg-panel,#12101a)]";

const STYLE_PRESETS = [
  "cinematic realistic",
  "documentary",
  "anime",
  "noir",
  "commercial",
  "fantasy epic",
];

const WORKFLOW_STEPS = [
  {
    n: "01",
    title: "Create shell",
    body: "Name the series and lock your premise. Free — no credits held.",
  },
  {
    n: "02",
    title: "Generate library",
    body: "Persistent character identities across every episode.",
  },
  {
    n: "03",
    title: "Generate shots",
    body: "Frame-by-frame boards across episodes and scenes.",
  },
  {
    n: "04",
    title: "Export PDF",
    body: "Consolidated board for review and handoff.",
  },
];

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {children}
      </span>
      {hint ? <span className="text-[10px] text-white/35">{hint}</span> : null}
    </div>
  );
}

function EpisodeStepper({ value, min, max, onChange, disabled }) {
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Fewer episodes"
        className={`inline-flex h-11 w-11 items-center justify-center border border-[var(--border-color)] bg-white/[0.02] text-lg text-white/70 transition-colors hover:border-[var(--border-primary)] hover:text-[var(--color-primary,#00ff88)] disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}
      >
        −
      </button>
      <div className="flex h-11 min-w-[3.5rem] items-center justify-center border-y border-[var(--border-color)] bg-black/20 px-3 tabular-nums text-sm font-semibold">
        {value}
      </div>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="More episodes"
        className={`inline-flex h-11 w-11 items-center justify-center border border-[var(--border-color)] bg-white/[0.02] text-lg text-white/70 transition-colors hover:border-[var(--border-primary)] hover:text-[var(--color-primary,#00ff88)] disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}
      >
        +
      </button>
      <span className="ml-3 text-[10px] uppercase tracking-wide text-white/35">max {max}</span>
    </div>
  );
}

function SkeletonBar({ className = "" }) {
  return <div className={`animate-pulse bg-white/10 ${className}`} aria-hidden />;
}

function ProjectListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="space-y-2 border border-white/5 bg-white/[0.02] px-3 py-2.5"
        >
          <SkeletonBar className="h-4 w-3/4" />
          <SkeletonBar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function CharacterCardSkeleton({ count = 4 }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="Loading characters"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`overflow-hidden ${panelClass}`}>
          <SkeletonBar className="aspect-[4/5] w-full" />
          <div className="space-y-2 p-3">
            <SkeletonBar className="h-4 w-2/3" />
            <SkeletonBar className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ShotCardSkeleton({ count = 3 }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading shots"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`overflow-hidden ${panelClass}`}>
          <SkeletonBar className="aspect-video w-full" />
          <div className="space-y-2 p-3">
            <SkeletonBar className="h-3 w-1/2" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("complete") || s.includes("ready") || s === "succeeded") {
    return "text-[var(--color-primary,#00ff88)]";
  }
  if (s.includes("fail") || s.includes("error")) return "text-red-400";
  if (s.includes("process") || s.includes("generat") || s.includes("queue")) {
    return "text-amber-300";
  }
  return "text-white/50";
}

function CreditHint({ step, ctx, pricing }) {
  const est = estimateStoryboardCredits(step, ctx, pricing);
  return (
    <span
      className="text-[10px] font-semibold tabular-nums text-[var(--color-primary,#00ff88)]/70"
      title={est.note}
    >
      {est.label}
    </span>
  );
}

function ProgressBar({ value }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className="mt-2 h-1.5 overflow-hidden bg-white/10"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full w-full origin-left bg-[var(--color-primary,#00ff88)] motion-safe:transition-transform motion-safe:duration-500 motion-reduce:transition-none"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

export default function StoryboardStudio({ apiKey }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [project, setProject] = useState(null);
  const [shots, setShots] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pollNote, setPollNote] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [episodes, setEpisodes] = useState(1);
  const [style, setStyle] = useState("cinematic realistic");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoPoll, setAutoPoll] = useState(true);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [pricing, setPricing] = useState(defaultPricingConfig());
  const [lastCost, setLastCost] = useState(null);
  const [addTab, setAddTab] = useState("episode");
  const [addEpisodeIndex, setAddEpisodeIndex] = useState(1);
  const [addSceneEpisode, setAddSceneEpisode] = useState(1);
  const [addSceneIndex, setAddSceneIndex] = useState(1);
  const [addShotEpisode, setAddShotEpisode] = useState(1);
  const [addShotScene, setAddShotScene] = useState(1);
  const [addShotIndex, setAddShotIndex] = useState(1);
  const [addDescription, setAddDescription] = useState("");
  const pollBusyRef = useRef(false);

  const selected = useMemo(
    () => projects.find((p) => String(p.id) === String(selectedId)) || project,
    [projects, selectedId, project],
  );

  const episodeList = useMemo(() => extractEpisodes(project), [project]);
  const projectEpisodes =
    Number(selected?.num_episodes || project?.num_episodes || episodes) || 1;
  const boardProgress = extractProgressPercent(project) ?? extractProgressPercent(selected);

  const estimateCtx = useMemo(
    () => ({
      episodes: projectEpisodes,
      shots: shots.length,
    }),
    [projectEpisodes, shots.length],
  );

  const boardBusy = useMemo(() => {
    const projectStatus = selected?.status || project?.status;
    if (isActiveStoryboardStatus(projectStatus)) return true;
    if (shots.some((s) => isActiveStoryboardStatus(s.status))) return true;
    if (isActiveStoryboardStatus(extractExportStatus(pdfStatus))) return true;
    return false;
  }, [selected, project, shots, pdfStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storyboard/pricing", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.pricing) setPricing(data.pricing);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshList = useCallback(async () => {
    if (!apiKey) return;
    setLoadingList(true);
    setError("");
    try {
      const list = await listStoryboardProjects(apiKey);
      setProjects(list);
      try {
        localStorage.setItem(
          PERSIST_KEY,
          JSON.stringify({
            selectedId,
            title,
            prompt,
            episodes,
            style,
            webhookUrl,
            autoPoll,
          }),
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err.message || "Failed to list projects");
    } finally {
      setLoadingList(false);
    }
  }, [
    apiKey,
    selectedId,
    title,
    prompt,
    episodes,
    style,
    webhookUrl,
    autoPoll,
  ]);

  const refreshDetail = useCallback(
    async (id = selectedId, { silent = false } = {}) => {
      if (!apiKey || id == null) return;
      if (!silent) setLoadingDetail(true);
      if (!silent) setError("");
      try {
        const [proj, shotPayload, library, pdf] = await Promise.all([
          getStoryboardProject(apiKey, id),
          getStoryboardShots(apiKey, id).catch(() => []),
          getStoryboardLibrary(apiKey, id).catch(() => null),
          getStoryboardPdfStatus(apiKey, id).catch(() => null),
        ]);
        setProject(proj);
        const nested = flattenStoryboardShots(proj);
        const flat = flattenStoryboardShots(shotPayload);
        setShots(flat.length ? flat : nested);
        setCharacters(extractLibraryCharacters(library));
        setPdfStatus(pdf);
        setProjects((prev) =>
          prev.map((p) =>
            String(p.id) === String(id)
              ? {
                  ...p,
                  status: proj?.status ?? p.status,
                  title: proj?.title ?? p.title,
                }
              : p,
          ),
        );
      } catch (err) {
        if (!silent) setError(err.message || "Failed to load project");
      } finally {
        if (!silent) setLoadingDetail(false);
      }
    },
    [apiKey, selectedId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.title) setTitle(data.title);
      if (data.prompt) setPrompt(data.prompt);
      if (data.episodes) setEpisodes(data.episodes);
      if (data.style) setStyle(data.style);
      if (typeof data.webhookUrl === "string") setWebhookUrl(data.webhookUrl);
      if (typeof data.autoPoll === "boolean") setAutoPoll(data.autoPoll);
      if (data.selectedId != null) setSelectedId(data.selectedId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    refreshList();
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedId == null) {
      setProject(null);
      setShots([]);
      setCharacters([]);
      setPdfStatus(null);
      setPollNote("");
      return;
    }
    refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  useEffect(() => {
    if (!apiKey || selectedId == null || !autoPoll || !boardBusy) {
      setPollNote("");
      return undefined;
    }

    setPollNote("Live polling…");
    const tick = async () => {
      if (pollBusyRef.current) return;
      pollBusyRef.current = true;
      try {
        await refreshDetail(selectedId, { silent: true });
      } finally {
        pollBusyRef.current = false;
      }
    };

    const id = window.setInterval(tick, POLL_MS);
    return () => {
      window.clearInterval(id);
      setPollNote("");
    };
  }, [apiKey, selectedId, autoPoll, boardBusy, refreshDetail]);

  const run = async (label, fn) => {
    setBusy(label);
    setError("");
    try {
      const result = await fn();
      if (result?.naga?.costCredits != null) {
        setLastCost(result.naga);
      }
      return result;
    } catch (err) {
      setError(err.message || `${label} failed`);
      return null;
    } finally {
      setBusy("");
    }
  };

  const webhookOpts = () => {
    const url = webhookUrl.trim();
    return url ? { webhook_url: url } : {};
  };

  const handleCreate = () =>
    run("Creating project…", async () => {
      if (!prompt.trim()) throw new Error("Write a story prompt first");
      const created = await createStoryboardProject(apiKey, {
        title: title.trim() || "Untitled series",
        prompt: prompt.trim(),
        num_episodes: Number(episodes) || 1,
        description: style,
      });
      const id = created?.id ?? created?.project_id ?? created?.project?.id;
      await refreshList();
      if (id != null) {
        setSelectedId(id);
        await refreshDetail(id);
      }
      return created;
    });

  const handleGenerateLibrary = () =>
    run("Generating character library…", async () => {
      const res = await generateStoryboardLibrary(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
      return res;
    });

  const handleGenerateShots = () =>
    run("Generating shots…", async () => {
      const res = await generateStoryboardShots(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
      return res;
    });

  const handleGeneratePdf = () =>
    run("Generating PDF…", async () => {
      const res = await generateStoryboardPdf(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
      return res;
    });

  const openExport = (payload, label) => {
    const url = extractExportUrl(payload);
    if (!url) {
      setError(`${label} not ready yet — wait for polling or hit Refresh`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDeleteProject = (projectId = selectedId) =>
    run("Deleting…", async () => {
      if (projectId == null) return;
      const label =
        projects.find((p) => String(p.id) === String(projectId))?.title ||
        `Project ${projectId}`;
      if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
      await deleteStoryboardProject(apiKey, projectId);
      if (String(selectedId) === String(projectId)) setSelectedId(null);
      await refreshList();
    });

  const handleRegenShot = (shot) =>
    run(`Regenerating shot ${shot.id}…`, async () => {
      const res = await regenerateStoryboardShot(apiKey, shot.id, {
        description: shot.description || undefined,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
      return res;
    });

  const handleRegenCharacter = (character) =>
    run(`Regenerating ${character.name}…`, async () => {
      const desc =
        window.prompt(
          `Describe changes for ${character.name}`,
          character.description || "Keep identity, improve clarity and costume detail",
        ) || "";
      if (!desc.trim()) return null;
      const res = await regenerateStoryboardCharacter(
        apiKey,
        character.id,
        desc.trim(),
        webhookOpts(),
      );
      await refreshDetail(selectedId);
      return res;
    });

  const handleAdd = () =>
    run(`Adding ${addTab}…`, async () => {
      const wh = webhookOpts();
      let res;
      if (addTab === "episode") {
        res = await addStoryboardEpisode(apiKey, {
          project_id: Number(selectedId),
          episode_index: Number(addEpisodeIndex) || 1,
          description: addDescription.trim() || null,
          ...wh,
        });
      } else if (addTab === "scene") {
        res = await addStoryboardScene(apiKey, {
          project_id: Number(selectedId),
          episode_index: Number(addSceneEpisode) || 1,
          scene_index: Number(addSceneIndex) || 1,
          description: addDescription.trim() || null,
          ...wh,
        });
      } else {
        res = await addStoryboardShot(apiKey, {
          project_id: Number(selectedId),
          episode_index: Number(addShotEpisode) || 1,
          scene_index: Number(addShotScene) || 1,
          shot_index: Number(addShotIndex) || 1,
          description: addDescription.trim() || null,
          ...wh,
        });
      }
      setAddDescription("");
      await refreshDetail(selectedId);
      return res;
    });

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/50">
        Sign in to use Storyboard Studio
      </div>
    );
  }

  const showCharacterSkeleton = loadingDetail && selectedId && characters.length === 0;
  const showShotSkeleton = loadingDetail && selectedId && shots.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg-app,#0a0812)] text-white lg:flex-row">
      <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-[var(--border-color,rgba(255,255,255,0.1))] bg-[var(--bg-card,#080808)] lg:max-h-none lg:w-[min(100%,20rem)] lg:border-b-0 lg:border-r">
        <div className="border-b border-[var(--border-color)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary,#00ff88)]/70">
            Storyboard
          </p>
          <h2 className="mt-1 text-balance text-lg font-black tracking-tight">Projects</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Episodic boards with persistent characters.
          </p>
        </div>

        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
          {loadingList && <ProjectListSkeleton />}
          {!loadingList && projects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-white/50">
              No projects yet — create one below.
            </p>
          )}
          {!loadingList &&
            projects.map((p) => {
              const active = String(p.id) === String(selectedId);
              return (
                <div key={p.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`min-h-11 w-full rounded-none border px-3 py-2.5 pr-10 text-left transition-colors ${focusRing} ${
                      active
                        ? "border-[var(--border-primary)] bg-[var(--color-primary,#00ff88)]/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold">
                      {p.title || `Project ${p.id}`}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] uppercase tracking-wide tabular-nums ${statusTone(p.status)}`}
                    >
                      {p.status || "unknown"} · {p.num_episodes ?? "?"} ep
                    </p>
                  </button>
                  <button
                    type="button"
                    title="Delete project"
                    aria-label={`Delete ${p.title || `Project ${p.id}`}`}
                    disabled={!!busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(p.id);
                    }}
                    className={`absolute right-2 top-1/2 z-10 -translate-y-1/2 p-1.5 text-white/30 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30 ${focusRing}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
        </div>

        <div className="border-t border-[var(--border-color)] p-3">
          <button
            type="button"
            onClick={refreshList}
            disabled={!!busy}
            className={`${btnGhost} w-full py-2`}
          >
            {busy === "Refreshing…" ? busy : "Refresh list"}
          </button>
        </div>
      </aside>

      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        aria-busy={boardBusy || loadingDetail ? "true" : undefined}
      >
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            <span className="min-w-0 flex-1">{error}</span>
            {/insufficient credits/i.test(error) && (
              <a href="/credits" className={`${btnPrimary} shrink-0 px-3 py-1.5 normal-case`}>
                Buy credits
              </a>
            )}
            <button
              type="button"
              className={`shrink-0 text-xs underline opacity-80 ${focusRing}`}
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}
        {(busy || pollNote || lastCost) && (
          <div
            aria-live="polite"
            aria-atomic="true"
            className="border-b border-[var(--border-primary)] bg-[var(--color-primary,#00ff88)]/5 px-4 py-2 text-sm text-[var(--color-primary,#00ff88)]/90"
          >
            {busy || pollNote}
            {boardBusy && autoPoll && !busy ? " · board still running" : ""}
            {lastCost?.costCredits != null && !busy ? (
              <span className="ml-2 tabular-nums text-white/50">
                Last hold ~{lastCost.costCredits} cr
                {lastCost.generationId
                  ? ` · gen ${String(lastCost.generationId).slice(0, 8)}`
                  : ""}
              </span>
            ) : null}
          </div>
        )}

        {!selectedId ? (
          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
            {/* ── Hero filmstrip — landing-style media treatment ── */}
            <div className="relative overflow-hidden border-b border-[#ff6ec7]/20">
              <div className="relative flex h-36 sm:h-44 lg:h-52">
                <div className="relative w-[55%] shrink-0 overflow-hidden">
                  <img
                    src="/assets/storyboard/panel-street.jpg"
                    alt="Anime storyboard panel — rain-soaked street"
                    className="h-full w-full scale-[1.04] object-cover object-center"
                  />
                </div>
                <div className="relative w-[25%] shrink-0 overflow-hidden border-l border-[#ff6ec7]/20">
                  <img
                    src="/assets/storyboard/panel-overhead.jpg"
                    alt="Anime storyboard panel — overhead city"
                    className="h-full w-full scale-[1.04] object-cover object-top"
                  />
                </div>
                <div className="relative w-[20%] shrink-0 overflow-hidden border-l border-[#00d4ff]/20">
                  <img
                    src="/assets/storyboard/panel-subway.jpg"
                    alt="Anime storyboard panel — determined face close-up"
                    className="h-full w-full scale-[1.04] object-cover object-top"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/95 via-[#0a0812]/45 to-[#ff6ec7]/10" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0812]/75 via-[#0a0812]/20 to-transparent" />
              </div>
              {/* Text overlay */}
              <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col justify-end px-4 pb-4 sm:px-6 sm:pb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/80">
                  New project
                </p>
                <h1 className="mt-0.5 text-balance text-2xl font-black tracking-tight sm:text-3xl">
                  Storyboard
                </h1>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/65 sm:text-sm">
                  Set up a series shell, then run library → shots → PDF when you are ready.
                  Credits are held per step and restored if a step fails.
                </p>
              </div>
            </div>

            <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="p-4 sm:p-6">
                <div className={`divide-y divide-[var(--border-color)] ${panelClass}`}>
                  <section className="p-4 sm:p-5">
                    <FieldLabel>Series title</FieldLabel>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Untitled series"
                      className={`${fieldClass} min-h-12 px-4 py-3 text-base font-semibold tracking-tight placeholder:font-normal placeholder:text-white/25`}
                    />
                  </section>

                  <section className="p-4 sm:p-5">
                    <FieldLabel hint="Required">Story prompt</FieldLabel>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={7}
                      placeholder="Premise, characters, tone, setting — enough for the model to build a coherent multi-episode board…"
                      className={`${fieldClass} min-h-[10rem] resize-y border-l-2 border-l-[var(--color-primary,#00ff88)]/30 bg-black/30 px-4 py-3 text-sm leading-relaxed placeholder:text-white/25 focus:border-l-[var(--color-primary,#00ff88)]`}
                    />
                  </section>

                  <section className="grid gap-6 p-4 sm:grid-cols-2 sm:p-5">
                    <div>
                      <FieldLabel>Episodes</FieldLabel>
                      <EpisodeStepper
                        value={episodes}
                        min={1}
                        max={10}
                        disabled={!!busy}
                        onChange={setEpisodes}
                      />
                    </div>
                    <div>
                      <FieldLabel>Visual style</FieldLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {STYLE_PRESETS.map((preset) => {
                          const active = style === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={!!busy}
                              onClick={() => setStyle(preset)}
                              className={`px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
                                active
                                  ? "bg-[var(--color-primary,#00ff88)] text-black"
                                  : "border border-[var(--border-color)] bg-white/[0.02] text-white/50 hover:border-[var(--border-primary)] hover:text-white/80"
                              }`}
                            >
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="Or type a custom look…"
                        className={`${fieldClass} mt-3 min-h-10 px-3 py-2 text-xs text-white/80 placeholder:text-white/25`}
                      />
                    </div>
                  </section>

                  <section className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <p className="max-w-md text-xs leading-relaxed text-white/50">
                      Creating a project is{" "}
                      <span className="text-[var(--color-primary,#00ff88)]/90">free</span>.
                      Library, shots, and PDF show their credit cost before you run them.
                    </p>
                    <button
                      type="button"
                      disabled={!!busy || !prompt.trim()}
                      onClick={handleCreate}
                      className={`${btnPrimary} min-h-12 shrink-0 px-8 py-3 text-sm normal-case sm:min-w-[12rem]`}
                    >
                      {busy === "Creating project…" ? busy : "Create project →"}
                    </button>
                  </section>
                </div>
              </div>

              <aside className="border-t border-[var(--border-color)] bg-[var(--bg-card,#080808)] p-4 sm:p-5 lg:border-l lg:border-t-0">
                {/* Sample output panels */}
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Sample output
                  </p>
                  <div className="flex gap-1.5">
                    <div className="relative w-[38%] shrink-0 overflow-hidden border border-[#ff6ec7]/20">
                      <img
                        src="/assets/storyboard/panel-face.jpg"
                        alt="Sample character panel"
                        className="aspect-[4/5] h-full w-full scale-[1.04] object-cover object-top"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/90 via-transparent to-[#ff6ec7]/10" />
                      <div className="absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-[#0a0812]/80 to-transparent px-1.5 py-1">
                        <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#00ff88]/80">Character</span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="relative overflow-hidden border border-[#00d4ff]/20">
                        <img
                          src="/assets/storyboard/panel-street.jpg"
                          alt="Sample wide shot panel"
                          className="aspect-video w-full scale-[1.04] object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/90 via-transparent to-[#ff6ec7]/10" />
                        <div className="absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-[#0a0812]/80 to-transparent px-1.5 py-1">
                          <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#00ff88]/80">Wide shot</span>
                        </div>
                      </div>
                      <div className="relative overflow-hidden border border-[#ff6ec7]/20">
                        <img
                          src="/assets/storyboard/panel-subway.jpg"
                          alt="Sample close-up panel"
                          className="aspect-video w-full scale-[1.04] object-cover object-top"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/90 via-transparent to-[#ff6ec7]/10" />
                        <div className="absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-[#0a0812]/80 to-transparent px-1.5 py-1">
                          <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#00ff88]/80">Close-up</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                  Workflow
                </p>
                <ol className="mt-4 space-y-0">
                  {WORKFLOW_STEPS.map((step, i) => (
                    <li
                      key={step.n}
                      className={`relative flex gap-3 pb-5 ${
                        i < WORKFLOW_STEPS.length - 1
                          ? "before:absolute before:left-[0.65rem] before:top-7 before:h-[calc(100%-1.25rem)] before:w-px before:bg-[var(--border-color)]"
                          : ""
                      }`}
                    >
                      <span className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center bg-[var(--bg-card,#080808)] text-[10px] font-bold tabular-nums text-[var(--color-primary,#00ff88)]">
                        {step.n}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-xs font-bold uppercase tracking-[0.06em] text-white/80">
                          {step.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 border border-[var(--border-color)] bg-black/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    Tip
                  </p>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
                    Write the prompt like a show bible — who, where, and what changes each
                    episode.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-color)] px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className={`mb-2 text-xs text-white/50 hover:text-[var(--color-primary,#00ff88)] ${focusRing}`}
                >
                  ← New project
                </button>
                <h1 className="truncate text-balance text-xl font-black tracking-tight sm:text-2xl">
                  {selected?.title || project?.title || `Project ${selectedId}`}
                </h1>
                <p
                  className={`mt-1 text-xs uppercase tracking-wide tabular-nums ${statusTone(
                    selected?.status || project?.status,
                  )}`}
                >
                  {selected?.status || project?.status || "—"}
                  {loadingDetail ? " · refreshing…" : ""}
                  {boardBusy && autoPoll ? " · live" : ""}
                  {boardProgress != null ? ` · ${boardProgress}%` : ""}
                </p>
                <ProgressBar value={boardProgress} />
                {(project?.prompt || selected?.prompt) && (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/50 line-clamp-3">
                    {project?.prompt || selected?.prompt}
                  </p>
                )}
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => refreshDetail(selectedId)}
                  className={`${btnGhost} flex-1 sm:flex-none`}
                >
                  {busy === "Refreshing…" ? busy : "Refresh"}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateLibrary}
                  className={`${btnGhost} flex-1 sm:flex-none`}
                >
                  {busy === "Generating library…" ? busy : "Generate library"}
                  {busy !== "Generating library…" && (
                    <CreditHint step="generateLibrary" ctx={estimateCtx} pricing={pricing} />
                  )}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateShots}
                  className={`${btnPrimary} flex-1 sm:flex-none`}
                >
                  {busy === "Generating shots…" ? busy : "Generate shots"}
                  {busy !== "Generating shots…" && (
                    <span className="text-[10px] font-semibold tabular-nums text-black/60">
                      {
                        estimateStoryboardCredits("generateShots", estimateCtx, pricing)
                          .label
                      }
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => handleDeleteProject()}
                  className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-none border border-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-red-300/80 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${focusRing}`}
                >
                  {busy === "Deleting…" ? busy : "Delete project"}
                </button>
              </div>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 space-y-8 overflow-y-auto p-4 sm:p-5">
              <section className="grid gap-3 lg:grid-cols-3">
                <div className={`p-4 ${panelClass}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Live progress
                  </p>
                  <label className="mt-3 flex min-h-11 items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={autoPoll}
                      onChange={(e) => setAutoPoll(e.target.checked)}
                      className="accent-[var(--color-primary,#00ff88)]"
                    />
                    Auto-poll every {POLL_MS / 1000}s while running
                  </label>
                  <p className="mt-2 text-xs text-white/50">
                    {boardBusy
                      ? "Still running — refresh or wait. MuAPI does not support cancel."
                      : "Idle — polling pauses when nothing is running."}
                  </p>
                  <ProgressBar value={boardProgress} />
                </div>

                <div className={`p-4 lg:col-span-2 ${panelClass}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Optional webhook
                  </p>
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your.app/hooks/storyboard"
                    className={`${fieldClass} mt-3 min-h-11 px-3 py-2 text-sm`}
                  />
                  <p className="mt-2 text-xs text-white/50">
                    If set, MuAPI progress events are also sent to this URL. Studio keeps
                    polling either way.
                  </p>
                </div>
              </section>

              <section className={`p-4 ${panelClass}`}>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Credit estimates</h2>
                  <p className="text-xs text-white/50">
                    Approximate cost held when you run each step. Restored if the step
                    fails.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["generateLibrary", "Library"],
                    ["generateShots", "Shots"],
                    ["generatePdf", "PDF"],
                    ["addEpisode", "Add episode"],
                    ["addScene", "Add scene"],
                    ["addShot", "Add shot"],
                    ["regenShot", "Regen shot"],
                    ["regenCharacter", "Regen character"],
                  ].map(([step, label]) => {
                    const est = estimateStoryboardCredits(step, estimateCtx, pricing);
                    return (
                      <div
                        key={step}
                        className="border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <p className="text-xs text-white/50">{label}</p>
                        <p className="text-sm font-bold tabular-nums text-[var(--color-primary,#00ff88)]">
                          {est.label}
                        </p>
                        <p className="text-[10px] text-white/40">{est.note}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={`p-4 ${panelClass}`}>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">PDF export</h2>
                  <p className="text-xs text-white/50">
                    Generate a consolidated board PDF, then open when ready.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={handleGeneratePdf}
                    className={`${btnGhost} text-white/70`}
                  >
                    {busy === "Generating PDF…" ? busy : "Generate PDF"}
                    {busy !== "Generating PDF…" && (
                      <CreditHint step="generatePdf" ctx={estimateCtx} pricing={pricing} />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy || !extractExportUrl(pdfStatus)}
                    onClick={() => openExport(pdfStatus, "PDF")}
                    className={`${btnGhost} text-white/55 hover:border-white/25`}
                  >
                    Open PDF
                    {pdfStatus ? (
                      <span
                        className={`ml-2 text-[10px] uppercase ${statusTone(
                          extractExportStatus(pdfStatus),
                        )}`}
                      >
                        {extractExportStatus(pdfStatus)}
                      </span>
                    ) : (
                      <span className="ml-2 text-[10px] text-white/40">none yet</span>
                    )}
                  </button>
                </div>
              </section>

              <section className={`p-4 ${panelClass}`}>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Manual add</h2>
                  <p className="text-xs text-white/50">
                    Insert an episode, scene, or shot by index (1-based).
                  </p>
                </div>
                <div className="mb-3 flex gap-1 bg-white/[0.03] p-1">
                  {[
                    ["episode", "Episode"],
                    ["scene", "Scene"],
                    ["shot", "Shot"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAddTab(id)}
                      className={`min-h-10 flex-1 rounded-none py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] ${focusRing} ${
                        addTab === id
                          ? "bg-[var(--color-primary,#00ff88)]/20 text-[var(--color-primary,#00ff88)]"
                          : "text-white/50 hover:text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {addTab === "episode" && (
                    <label className="text-xs text-white/50">
                      Episode index
                      <input
                        type="number"
                        min={1}
                        value={addEpisodeIndex}
                        onChange={(e) => setAddEpisodeIndex(Number(e.target.value) || 1)}
                        className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                      />
                    </label>
                  )}
                  {addTab === "scene" && (
                    <>
                      <label className="text-xs text-white/50">
                        Episode index
                        <input
                          type="number"
                          min={1}
                          value={addSceneEpisode}
                          onChange={(e) =>
                            setAddSceneEpisode(Number(e.target.value) || 1)
                          }
                          className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                        />
                      </label>
                      <label className="text-xs text-white/50">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addSceneIndex}
                          onChange={(e) => setAddSceneIndex(Number(e.target.value) || 1)}
                          className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                        />
                      </label>
                    </>
                  )}
                  {addTab === "shot" && (
                    <>
                      <label className="text-xs text-white/50">
                        Episode index
                        <input
                          type="number"
                          min={1}
                          value={addShotEpisode}
                          onChange={(e) =>
                            setAddShotEpisode(Number(e.target.value) || 1)
                          }
                          className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                        />
                      </label>
                      <label className="text-xs text-white/50">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addShotScene}
                          onChange={(e) => setAddShotScene(Number(e.target.value) || 1)}
                          className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                        />
                      </label>
                      <label className="text-xs text-white/50">
                        Shot index
                        <input
                          type="number"
                          min={1}
                          value={addShotIndex}
                          onChange={(e) => setAddShotIndex(Number(e.target.value) || 1)}
                          className={`${fieldClass} mt-1 min-h-11 px-3 py-2 text-sm tabular-nums text-white`}
                        />
                      </label>
                    </>
                  )}
                </div>

                {episodeList.length > 0 ? (
                  <p className="mt-2 text-[10px] text-white/40">
                    Known episodes:{" "}
                    {episodeList
                      .map((ep) => `#${ep.index} ${ep.title} (${ep.sceneCount} sc)`)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-white/40">
                    No episode tree yet — add an episode or generate shots first.
                  </p>
                )}

                <textarea
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={3}
                  placeholder={`Optional ${addTab} description…`}
                  className={`${fieldClass} mt-3 resize-y px-3 py-2 text-sm`}
                />

                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleAdd}
                  className={`${btnPrimary} mt-3`}
                >
                  {busy?.startsWith("Adding") ? busy : `Add ${addTab}`}
                  {!busy?.startsWith("Adding") && (
                    <span className="text-[10px] font-semibold tabular-nums text-black/60">
                      {
                        estimateStoryboardCredits(
                          addTab === "episode"
                            ? "addEpisode"
                            : addTab === "scene"
                              ? "addScene"
                              : "addShot",
                          estimateCtx,
                          pricing,
                        ).label
                      }
                    </span>
                  )}
                </button>
              </section>

              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Character library</h2>
                  <p className="text-xs text-white/50">
                    Persistent identities for this series.
                  </p>
                </div>
                {showCharacterSkeleton ? (
                  <CharacterCardSkeleton />
                ) : characters.length === 0 ? (
                  <p className={`border border-dashed border-white/10 px-4 py-8 text-center text-xs text-white/50 ${panelClass}`}>
                    No characters yet — run{" "}
                    <strong className="text-white/70">Generate library</strong>.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {characters.map((c) => (
                      <div key={c.id} className={`overflow-hidden ${panelClass}`}>
                        <div className="aspect-[4/5] bg-white/[0.03]">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-white/40">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          {c.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-white/50">
                              {c.description}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => handleRegenCharacter(c)}
                            className={`mt-2 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[var(--color-primary,#00ff88)]/80 hover:text-[var(--color-primary,#00ff88)] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                          >
                            {busy === `Regenerating ${c.name}…` ? busy : "Regenerate →"}
                            {busy !== `Regenerating ${c.name}…` && (
                              <CreditHint
                                step="regenCharacter"
                                ctx={estimateCtx}
                                pricing={pricing}
                              />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Shots</h2>
                  <p className="text-xs tabular-nums text-white/50">
                    {shots.length} shot{shots.length === 1 ? "" : "s"}
                    {shots.filter((s) => s.image_url).length
                      ? ` · ${shots.filter((s) => s.image_url).length} with frames`
                      : ""}
                  </p>
                </div>
                {showShotSkeleton ? (
                  <ShotCardSkeleton />
                ) : shots.length === 0 ? (
                  <p className={`border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/50 ${panelClass}`}>
                    No shots yet — run{" "}
                    <strong className="text-white/70">Generate shots</strong> after the
                    library is ready.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {shots.map((shot) => (
                      <article
                        key={
                          shot.id ||
                          `${shot.episode_index}-${shot.scene_index}-${shot.shot_index}`
                        }
                        className={`overflow-hidden ${panelClass}`}
                      >
                        <div className="aspect-video bg-white/[0.03]">
                          {shot.image_url ? (
                            <img
                              src={shot.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-white/40">
                              <span>
                                {isActiveStoryboardStatus(shot.status)
                                  ? "Generating…"
                                  : "Pending / no frame"}
                              </span>
                              {shot.progress != null && (
                                <span className="tabular-nums text-[var(--color-primary,#00ff88)]/70">
                                  {shot.progress}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] uppercase tracking-wide tabular-nums text-white/50">
                            Ep {shot.episode_index ?? "—"} · Sc {shot.scene_index ?? "—"} ·
                            Shot {shot.shot_index ?? shot.id ?? "—"}
                            {shot.camera ? ` · ${shot.camera}` : ""}
                          </p>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-white/70">
                            {shot.description || "No description"}
                          </p>
                          <ProgressBar value={shot.progress} />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] uppercase ${statusTone(shot.status)}`}
                            >
                              {shot.status}
                            </span>
                            {shot.id != null && (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => handleRegenShot(shot)}
                                className={`inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[var(--color-primary,#00ff88)]/80 hover:text-[var(--color-primary,#00ff88)] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                              >
                                {busy === `Regenerating shot ${shot.id}…`
                                  ? "Regenerating…"
                                  : "Regenerate"}
                                {busy !== `Regenerating shot ${shot.id}…` && (
                                  <CreditHint
                                    step="regenShot"
                                    ctx={estimateCtx}
                                    pricing={pricing}
                                  />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
