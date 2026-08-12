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

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("complete") || s.includes("ready") || s === "succeeded") {
    return "text-[#00ff88]";
  }
  if (s.includes("fail") || s.includes("error")) return "text-red-400";
  if (s.includes("process") || s.includes("generat") || s.includes("queue")) {
    return "text-amber-300";
  }
  return "text-white/45";
}

function CreditHint({ step, ctx, pricing }) {
  const est = estimateStoryboardCredits(step, ctx, pricing);
  return (
    <span className="text-[10px] font-semibold text-[#00ff88]/70" title={est.note}>
      {est.label}
    </span>
  );
}

function ProgressBar({ value }) {
  if (value == null) return null;
  return (
    <div
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[#00ff88] transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
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
  const [title, setTitle] = useState("Untitled series");
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

  const handleDelete = () =>
    run("Deleting…", async () => {
      if (!selectedId) return;
      if (!window.confirm("Delete this storyboard project?")) return;
      await deleteStoryboardProject(apiKey, selectedId);
      setSelectedId(null);
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
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/40">
        Sign in to use Storyboard Studio
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050505] text-white lg:flex-row">
      <aside className="flex max-h-[40vh] w-full shrink-0 flex-col border-b border-white/10 bg-[#080808] lg:max-h-none lg:w-[min(100%,20rem)] lg:border-b-0 lg:border-r">
        <div className="border-b border-white/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">
            Storyboard
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight">Projects</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            Episodic boards with persistent characters.
          </p>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {loadingList && (
            <p className="px-2 py-4 text-center text-xs text-white/35">Loading…</p>
          )}
          {!loadingList && projects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-white/35">
              No projects yet — create one below.
            </p>
          )}
          {projects.map((p) => {
            const active = String(p.id) === String(selectedId);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`min-h-11 w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-[#00ff88]/35 bg-[#00ff88]/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <p className="truncate text-sm font-semibold">
                  {p.title || `Project ${p.id}`}
                </p>
                <p
                  className={`mt-0.5 text-[10px] uppercase tracking-wide ${statusTone(p.status)}`}
                >
                  {p.status || "unknown"} · {p.num_episodes ?? "?"} ep
                </p>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={refreshList}
            disabled={!!busy}
            className="min-h-11 w-full rounded-md border border-white/10 py-2 text-xs font-semibold text-white/55 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
          >
            Refresh list
          </button>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            <span className="min-w-0 flex-1">{error}</span>
            {/insufficient credits/i.test(error) && (
              <a
                href="/credits"
                className="shrink-0 rounded-md bg-[#00ff88] px-3 py-1.5 text-xs font-bold text-black"
              >
                Buy credits
              </a>
            )}
            <button
              type="button"
              className="shrink-0 text-xs underline opacity-80"
              onClick={() => setError("")}
            >
              Dismiss
            </button>
          </div>
        )}
        {(busy || pollNote || lastCost) && (
          <div className="border-b border-[#00ff88]/15 bg-[#00ff88]/5 px-4 py-2 text-sm text-[#00ff88]/90">
            {busy || pollNote}
            {boardBusy && autoPoll && !busy ? " · board still running" : ""}
            {lastCost?.costCredits != null && !busy ? (
              <span className="ml-2 text-white/45">
                Last hold ~{lastCost.costCredits} cr
                {lastCost.generationId
                  ? ` · gen ${String(lastCost.generationId).slice(0, 8)}`
                  : ""}
              </span>
            ) : null}
          </div>
        )}

        {!selectedId ? (
          <div className="flex flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                New storyboard
              </h1>
              <p className="mt-2 text-sm text-white/45">
                Create a project shell, then generate library, shots, and PDF step by
                step. Credits are held per step and restored if a step fails.
              </p>

              <div className="mt-6 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Series title"
                  className="min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-[#00ff88]/40"
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder="Story prompt — premise, characters, tone, setting…"
                  className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[#00ff88]/40"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs text-white/40">
                    Episodes
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={episodes}
                      onChange={(e) => setEpisodes(Number(e.target.value) || 1)}
                      className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    Style
                    <input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                    />
                  </label>
                </div>

                <p className="text-[11px] text-white/35">
                  Creating a project is free. Library, shots, and PDF each show their
                  credit cost before you run them.
                </p>

                <button
                  type="button"
                  disabled={!!busy || !prompt.trim()}
                  onClick={handleCreate}
                  className="min-h-12 w-full rounded-md bg-[#00ff88] py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  Create project
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-2 text-[11px] text-white/35 hover:text-[#00ff88]"
                >
                  ← New project
                </button>
                <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">
                  {selected?.title || project?.title || `Project ${selectedId}`}
                </h1>
                <p
                  className={`mt-1 text-xs uppercase tracking-wide ${statusTone(
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
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45 line-clamp-3">
                    {project?.prompt || selected?.prompt}
                  </p>
                )}
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => refreshDetail(selectedId)}
                  className="min-h-11 flex-1 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40 sm:flex-none"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateLibrary}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40 sm:flex-none"
                >
                  Generate library
                  <CreditHint step="generateLibrary" ctx={estimateCtx} pricing={pricing} />
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateShots}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#00ff88] px-3 py-2 text-xs font-bold text-black disabled:opacity-40 sm:flex-none"
                >
                  Generate shots
                  <span className="text-[10px] font-semibold text-black/60">
                    {
                      estimateStoryboardCredits("generateShots", estimateCtx, pricing)
                        .label
                    }
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleDelete}
                  className="min-h-11 flex-1 rounded-md border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300/80 hover:bg-red-500/10 disabled:opacity-40 sm:flex-none"
                >
                  Delete
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-4 sm:p-5">
              <section className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Live progress
                  </p>
                  <label className="mt-3 flex min-h-11 items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={autoPoll}
                      onChange={(e) => setAutoPoll(e.target.checked)}
                      className="accent-[#00ff88]"
                    />
                    Auto-poll every {POLL_MS / 1000}s while running
                  </label>
                  <p className="mt-2 text-[11px] text-white/35">
                    {boardBusy
                      ? "Still running — refresh or wait. MuAPI does not support cancel."
                      : "Idle — polling pauses when nothing is running."}
                  </p>
                  <ProgressBar value={boardProgress} />
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 lg:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Optional webhook
                  </p>
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your.app/hooks/storyboard"
                    className="mt-3 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#00ff88]/40"
                  />
                  <p className="mt-2 text-[11px] text-white/35">
                    If set, MuAPI progress events are also sent to this URL. Studio keeps
                    polling either way.
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Credit estimates</h2>
                  <p className="text-[11px] text-white/35">
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
                        className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <p className="text-[11px] text-white/45">{label}</p>
                        <p className="text-sm font-bold text-[#00ff88]">{est.label}</p>
                        <p className="text-[10px] text-white/30">{est.note}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-bold">PDF export</h2>
                  <p className="text-[11px] text-white/35">
                    Generate a consolidated board PDF, then open when ready.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={handleGeneratePdf}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
                  >
                    Generate PDF
                    <CreditHint step="generatePdf" ctx={estimateCtx} pricing={pricing} />
                  </button>
                  <button
                    type="button"
                    disabled={!!busy || !extractExportUrl(pdfStatus)}
                    onClick={() => openExport(pdfStatus, "PDF")}
                    className="min-h-11 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:border-white/25 disabled:opacity-40"
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
                      <span className="ml-2 text-[10px] text-white/30">none yet</span>
                    )}
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Manual add</h2>
                  <p className="text-[11px] text-white/35">
                    Insert an episode, scene, or shot by index (1-based).
                  </p>
                </div>
                <div className="mb-3 flex gap-1 rounded-lg bg-white/[0.03] p-1">
                  {[
                    ["episode", "Episode"],
                    ["scene", "Scene"],
                    ["shot", "Shot"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAddTab(id)}
                      className={`min-h-10 flex-1 rounded-md py-1.5 text-[11px] font-bold ${
                        addTab === id
                          ? "bg-[#00ff88]/20 text-[#00ff88]"
                          : "text-white/40 hover:text-white/65"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {addTab === "episode" && (
                    <label className="text-xs text-white/40">
                      Episode index
                      <input
                        type="number"
                        min={1}
                        value={addEpisodeIndex}
                        onChange={(e) => setAddEpisodeIndex(Number(e.target.value) || 1)}
                        className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                      />
                    </label>
                  )}
                  {addTab === "scene" && (
                    <>
                      <label className="text-xs text-white/40">
                        Episode index
                        <input
                          type="number"
                          min={1}
                          value={addSceneEpisode}
                          onChange={(e) =>
                            setAddSceneEpisode(Number(e.target.value) || 1)
                          }
                          className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addSceneIndex}
                          onChange={(e) => setAddSceneIndex(Number(e.target.value) || 1)}
                          className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                    </>
                  )}
                  {addTab === "shot" && (
                    <>
                      <label className="text-xs text-white/40">
                        Episode index
                        <input
                          type="number"
                          min={1}
                          value={addShotEpisode}
                          onChange={(e) =>
                            setAddShotEpisode(Number(e.target.value) || 1)
                          }
                          className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addShotScene}
                          onChange={(e) => setAddShotScene(Number(e.target.value) || 1)}
                          className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Shot index
                        <input
                          type="number"
                          min={1}
                          value={addShotIndex}
                          onChange={(e) => setAddShotIndex(Number(e.target.value) || 1)}
                          className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                    </>
                  )}
                </div>

                {episodeList.length > 0 ? (
                  <p className="mt-2 text-[10px] text-white/30">
                    Known episodes:{" "}
                    {episodeList
                      .map((ep) => `#${ep.index} ${ep.title} (${ep.sceneCount} sc)`)
                      .join(" · ")}
                  </p>
                ) : (
                  <p className="mt-2 text-[10px] text-white/30">
                    No episode tree yet — add an episode or generate shots first.
                  </p>
                )}

                <textarea
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  rows={3}
                  placeholder={`Optional ${addTab} description…`}
                  className="mt-3 w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#00ff88]/40"
                />

                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleAdd}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#00ff88] px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
                >
                  Add {addTab}
                  <span className="text-[10px] font-semibold text-black/60">
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
                </button>
              </section>

              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Character library</h2>
                  <p className="text-[11px] text-white/35">
                    Persistent identities for this series.
                  </p>
                </div>
                {characters.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-white/35">
                    No characters yet — run{" "}
                    <strong className="text-white/55">Generate library</strong>.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {characters.map((c) => (
                      <div
                        key={c.id}
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]"
                      >
                        <div className="aspect-[4/5] bg-white/[0.03]">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt={c.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-white/25">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold">{c.name}</p>
                          {c.description && (
                            <p className="mt-1 line-clamp-2 text-[11px] text-white/40">
                              {c.description}
                            </p>
                          )}
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => handleRegenCharacter(c)}
                            className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                          >
                            Regenerate →
                            <CreditHint
                              step="regenCharacter"
                              ctx={estimateCtx}
                              pricing={pricing}
                            />
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
                  <p className="text-[11px] text-white/35">
                    {shots.length} shot{shots.length === 1 ? "" : "s"}
                    {shots.filter((s) => s.image_url).length
                      ? ` · ${shots.filter((s) => s.image_url).length} with frames`
                      : ""}
                  </p>
                </div>
                {shots.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-white/35">
                    No shots yet — run{" "}
                    <strong className="text-white/55">Generate shots</strong> after the
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
                        className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]"
                      >
                        <div className="aspect-video bg-white/[0.03]">
                          {shot.image_url ? (
                            <img
                              src={shot.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-white/25">
                              <span>
                                {isActiveStoryboardStatus(shot.status)
                                  ? "Generating…"
                                  : "Pending / no frame"}
                              </span>
                              {shot.progress != null && (
                                <span className="text-[#00ff88]/70">{shot.progress}%</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] uppercase tracking-wide text-white/35">
                            Ep {shot.episode_index ?? "—"} · Sc {shot.scene_index ?? "—"} ·
                            Shot {shot.shot_index ?? shot.id ?? "—"}
                            {shot.camera ? ` · ${shot.camera}` : ""}
                          </p>
                          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-white/70">
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
                                className="inline-flex min-h-10 items-center gap-1.5 text-[11px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                              >
                                Regenerate
                                <CreditHint
                                  step="regenShot"
                                  ctx={estimateCtx}
                                  pricing={pricing}
                                />
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
