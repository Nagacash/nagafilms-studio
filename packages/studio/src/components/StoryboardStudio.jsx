"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listStoryboardProjects,
  generateStoryboardProject,
  createStoryboardProject,
  getStoryboardProject,
  deleteStoryboardProject,
  generateStoryboardLibrary,
  generateStoryboardShots,
  generateStoryboardScripts,
  generateStoryboardPdf,
  getStoryboardPdfStatus,
  getStoryboardScripts,
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
  estimateStoryboardCredits,
  isActiveStoryboardStatus,
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

function CreditHint({ step, ctx }) {
  const est = estimateStoryboardCredits(step, ctx);
  return (
    <span className="text-[10px] font-semibold text-[#00ff88]/70" title={est.note}>
      {est.label}
    </span>
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
  const [usePro, setUsePro] = useState(false);
  const [mode, setMode] = useState("generate"); // generate | blank
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoPoll, setAutoPoll] = useState(true);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [scriptsStatus, setScriptsStatus] = useState(null);
  const [addTab, setAddTab] = useState("episode"); // episode | scene | shot
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

  const estimateCtx = useMemo(
    () => ({
      episodes: projectEpisodes,
      shots: shots.length,
      usePro,
    }),
    [projectEpisodes, shots.length, usePro],
  );

  const boardBusy = useMemo(() => {
    const projectStatus = selected?.status || project?.status;
    if (isActiveStoryboardStatus(projectStatus)) return true;
    if (shots.some((s) => isActiveStoryboardStatus(s.status))) return true;
    if (isActiveStoryboardStatus(extractExportStatus(pdfStatus))) return true;
    if (isActiveStoryboardStatus(extractExportStatus(scriptsStatus))) return true;
    return false;
  }, [selected, project, shots, pdfStatus, scriptsStatus]);

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
            usePro,
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
    usePro,
    webhookUrl,
    autoPoll,
  ]);

  const refreshDetail = useCallback(
    async (id = selectedId, { silent = false } = {}) => {
      if (!apiKey || id == null) return;
      if (!silent) setLoadingDetail(true);
      if (!silent) setError("");
      try {
        const [proj, shotPayload, library, pdf, scripts] = await Promise.all([
          getStoryboardProject(apiKey, id),
          getStoryboardShots(apiKey, id).catch(() => []),
          getStoryboardLibrary(apiKey, id).catch(() => null),
          getStoryboardPdfStatus(apiKey, id).catch(() => null),
          getStoryboardScripts(apiKey, id).catch(() => null),
        ]);
        setProject(proj);
        const nested = flattenStoryboardShots(proj);
        const flat = flattenStoryboardShots(shotPayload);
        setShots(flat.length ? flat : nested);
        setCharacters(extractLibraryCharacters(library));
        setPdfStatus(pdf);
        setScriptsStatus(scripts);
        setProjects((prev) =>
          prev.map((p) =>
            String(p.id) === String(id)
              ? { ...p, status: proj?.status ?? p.status, title: proj?.title ?? p.title }
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
      if (typeof data.usePro === "boolean") setUsePro(data.usePro);
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
      setScriptsStatus(null);
      setPollNote("");
      return;
    }
    refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  // Live progress polling loop (client-side; optional webhook for server push)
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
      await fn();
    } catch (err) {
      setError(err.message || `${label} failed`);
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
      let created;
      if (mode === "generate") {
        created = await generateStoryboardProject(apiKey, {
          prompt: prompt.trim(),
          num_episodes: Number(episodes) || 1,
          style,
          use_pro: usePro,
          sync: false,
          ...webhookOpts(),
        });
      } else {
        created = await createStoryboardProject(apiKey, {
          title: title.trim() || "Untitled series",
          prompt: prompt.trim(),
          num_episodes: Number(episodes) || 1,
          description: style,
        });
      }
      const id = created?.id ?? created?.project_id ?? created?.project?.id;
      await refreshList();
      if (id != null) {
        setSelectedId(id);
        await refreshDetail(id);
      }
    });

  const handleGenerateLibrary = () =>
    run("Generating character library…", async () => {
      await generateStoryboardLibrary(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
    });

  const handleGenerateShots = () =>
    run("Generating shots…", async () => {
      await generateStoryboardShots(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
    });

  const handleGenerateScripts = () =>
    run("Generating scripts…", async () => {
      await generateStoryboardScripts(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
    });

  const handleGeneratePdf = () =>
    run("Generating PDF…", async () => {
      await generateStoryboardPdf(apiKey, selectedId, {
        sync: false,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
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
      await regenerateStoryboardShot(apiKey, shot.id, {
        description: shot.description || undefined,
        ...webhookOpts(),
      });
      await refreshDetail(selectedId);
    });

  const handleRegenCharacter = (character) =>
    run(`Regenerating ${character.name}…`, async () => {
      const desc =
        window.prompt(
          `Describe changes for ${character.name}`,
          character.description || "Keep identity, improve clarity and costume detail",
        ) || "";
      if (!desc.trim()) return;
      await regenerateStoryboardCharacter(apiKey, character.id, desc.trim(), webhookOpts());
      await refreshDetail(selectedId);
    });

  const handleAdd = () =>
    run(`Adding ${addTab}…`, async () => {
      const wh = webhookOpts();
      if (addTab === "episode") {
        await addStoryboardEpisode(apiKey, {
          project_id: Number(selectedId),
          episode_index: Number(addEpisodeIndex) || 1,
          description: addDescription.trim() || null,
          ...wh,
        });
      } else if (addTab === "scene") {
        await addStoryboardScene(apiKey, {
          project_id: Number(selectedId),
          episode_index: Number(addSceneEpisode) || 1,
          scene_index: Number(addSceneIndex) || 1,
          description: addDescription.trim() || null,
          ...wh,
        });
      } else {
        await addStoryboardShot(apiKey, {
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
    });

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center text-white/40 text-sm">
        Sign in to use Storyboard Studio
      </div>
    );
  }

  const createEstimate =
    mode === "generate"
      ? estimateStoryboardCredits("generateProject", {
          episodes: Number(episodes) || 1,
          usePro,
        })
      : estimateStoryboardCredits("blankProject");

  return (
    <div className="flex h-full min-h-0 bg-[#050505] text-white">
      {/* Sidebar */}
      <aside className="flex w-[min(100%,20rem)] shrink-0 flex-col border-r border-white/10 bg-[#080808]">
        <div className="border-b border-white/10 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">
            Storyboard
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight">Projects</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/40">
            MuAPI episodic boards with persistent characters across shots.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingList && (
            <p className="px-2 py-4 text-center text-xs text-white/35">Loading…</p>
          )}
          {!loadingList && projects.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-white/35">
              No projects yet — create one on the right.
            </p>
          )}
          {projects.map((p) => {
            const active = String(p.id) === String(selectedId);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "border-[#00ff88]/35 bg-[#00ff88]/10"
                    : "border-white/5 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                <p className="truncate text-sm font-semibold">
                  {p.title || `Project ${p.id}`}
                </p>
                <p className={`mt-0.5 text-[10px] uppercase tracking-wide ${statusTone(p.status)}`}>
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
            className="w-full rounded-md border border-white/10 py-2 text-xs font-semibold text-white/55 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
          >
            Refresh list
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {error && (
          <div
            role="alert"
            className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
        {(busy || pollNote) && (
          <div className="border-b border-[#00ff88]/15 bg-[#00ff88]/5 px-4 py-2 text-sm text-[#00ff88]/90">
            {busy || pollNote}
            {boardBusy && autoPoll && !busy ? " · board still running" : ""}
          </div>
        )}

        {!selectedId ? (
          <div className="flex flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-6 py-10">
              <h1 className="text-3xl font-black tracking-tight">New storyboard</h1>
              <p className="mt-2 text-sm text-white/45">
                Generate a multi-episode board with character persistence via MuAPI
                Storyboarding, or create a blank project shell.
              </p>

              <div className="mt-6 flex gap-2 rounded-lg bg-white/[0.03] p-1">
                {[
                  ["generate", "AI generate"],
                  ["blank", "Blank project"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={`flex-1 rounded-md py-2 text-xs font-bold ${
                      mode === id
                        ? "bg-[#00ff88]/20 text-[#00ff88]"
                        : "text-white/45 hover:text-white/70"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {mode === "blank" && (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Series title"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-[#00ff88]/40"
                  />
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder="Story prompt — premise, characters, tone, setting…"
                  className="w-full resize-y rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[#00ff88]/40"
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-white/40">
                    Episodes
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={episodes}
                      onChange={(e) => setEpisodes(Number(e.target.value) || 1)}
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    Style
                    <input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                    />
                  </label>
                </div>
                {mode === "generate" && (
                  <label className="flex items-center gap-2 text-xs text-white/50">
                    <input
                      type="checkbox"
                      checked={usePro}
                      onChange={(e) => setUsePro(e.target.checked)}
                      className="accent-[#00ff88]"
                    />
                    Use Pro generation tier
                  </label>
                )}

                <label className="block text-xs text-white/40">
                  Webhook URL (optional push)
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your.app/hooks/storyboard"
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                  />
                  <span className="mt-1 block text-[10px] text-white/30">
                    MuAPI will POST progress here. Studio also live-polls while jobs run.
                  </span>
                </label>

                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-white/70">Estimated cost</p>
                    <p className="text-[10px] text-white/35">{createEstimate.note}</p>
                  </div>
                  <p className="text-sm font-bold text-[#00ff88]">{createEstimate.label}</p>
                </div>

                <button
                  type="button"
                  disabled={!!busy || !prompt.trim()}
                  onClick={handleCreate}
                  className="w-full rounded-md bg-[#00ff88] py-3 text-sm font-bold text-black disabled:opacity-40"
                >
                  {mode === "generate"
                    ? `Generate storyboard project · ${createEstimate.label}`
                    : "Create blank project"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-2 text-[11px] text-white/35 hover:text-[#00ff88]"
                >
                  ← New project
                </button>
                <h1 className="truncate text-2xl font-black tracking-tight">
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
                </p>
                {(project?.prompt || selected?.prompt) && (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/45 line-clamp-3">
                    {project?.prompt || selected?.prompt}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => refreshDetail(selectedId)}
                  className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateLibrary}
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
                >
                  Generate library
                  <CreditHint step="generateLibrary" ctx={estimateCtx} />
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleGenerateShots}
                  className="inline-flex items-center gap-2 rounded-md bg-[#00ff88] px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
                >
                  Generate shots
                  <span className="text-[10px] font-semibold text-black/60">
                    {estimateStoryboardCredits("generateShots", estimateCtx).label}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={handleDelete}
                  className="rounded-md border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300/80 hover:bg-red-500/10 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-8">
              {/* Progress + webhook + estimates */}
              <section className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Live progress
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-xs text-white/60">
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
                      ? "Board or export still in progress."
                      : "Idle — polling pauses when status settles."}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 lg:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Webhook push
                  </p>
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your.app/hooks/storyboard"
                    className="mt-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#00ff88]/40"
                  />
                  <p className="mt-2 text-[11px] text-white/35">
                    Attached to generate / add / regenerate calls when set. Use with live
                    polling for Studio feedback.
                  </p>
                </div>
              </section>

              {/* Credit estimates */}
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">Credit estimates</h2>
                    <p className="text-[11px] text-white/35">
                      Approximate Naga credits — MuAPI storyboard pricing is not fixed in
                      OpenAPI.
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["generateLibrary", "Library"],
                    ["generateShots", "Shots"],
                    ["generateScripts", "Scripts"],
                    ["generatePdf", "PDF"],
                    ["addEpisode", "Add episode"],
                    ["addScene", "Add scene"],
                    ["addShot", "Add shot"],
                    ["regenShot", "Regen shot"],
                  ].map(([step, label]) => {
                    const est = estimateStoryboardCredits(step, estimateCtx);
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

              {/* Export */}
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Export</h2>
                  <p className="text-[11px] text-white/35">
                    Generate scripts or a consolidated PDF, then open when ready.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={handleGenerateScripts}
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
                  >
                    Generate scripts
                    <CreditHint step="generateScripts" ctx={estimateCtx} />
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => openExport(scriptsStatus, "Scripts")}
                    className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:border-white/25 disabled:opacity-40"
                  >
                    Open scripts
                    {scriptsStatus ? (
                      <span
                        className={`ml-2 text-[10px] uppercase ${statusTone(
                          extractExportStatus(scriptsStatus),
                        )}`}
                      >
                        {extractExportStatus(scriptsStatus)}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={handleGeneratePdf}
                    className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:border-[#00ff88]/40 hover:text-[#00ff88] disabled:opacity-40"
                  >
                    Generate PDF
                    <CreditHint step="generatePdf" ctx={estimateCtx} />
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => openExport(pdfStatus, "PDF")}
                    className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:border-white/25 disabled:opacity-40"
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
                    ) : null}
                  </button>
                </div>
              </section>

              {/* Manual add */}
              <section className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4">
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Manual add</h2>
                  <p className="text-[11px] text-white/35">
                    Insert an episode, scene, or shot by index (1-based). Optional
                    description steers generation.
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
                      className={`flex-1 rounded-md py-1.5 text-[11px] font-bold ${
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
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
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
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addSceneIndex}
                          onChange={(e) => setAddSceneIndex(Number(e.target.value) || 1)}
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
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
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Scene index
                        <input
                          type="number"
                          min={1}
                          value={addShotScene}
                          onChange={(e) => setAddShotScene(Number(e.target.value) || 1)}
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                      <label className="text-xs text-white/40">
                        Shot index
                        <input
                          type="number"
                          min={1}
                          value={addShotIndex}
                          onChange={(e) => setAddShotIndex(Number(e.target.value) || 1)}
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#00ff88]/40"
                        />
                      </label>
                    </>
                  )}
                </div>

                {episodeList.length > 0 && (
                  <p className="mt-2 text-[10px] text-white/30">
                    Known episodes:{" "}
                    {episodeList
                      .map((ep) => `#${ep.index} ${ep.title} (${ep.sceneCount} sc)`)
                      .join(" · ")}
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
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#00ff88] px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
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
                      ).label
                    }
                  </span>
                </button>
              </section>

              {/* Characters */}
              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">Character library</h2>
                    <p className="text-[11px] text-white/35">
                      Persistent identities for this series. Regenerate to refine look.
                    </p>
                  </div>
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
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                          >
                            Regenerate →
                            <CreditHint step="regenCharacter" ctx={estimateCtx} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Shots */}
              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-bold">Shots</h2>
                  <p className="text-[11px] text-white/35">
                    {shots.length} shot{shots.length === 1 ? "" : "s"} with character-locked
                    framing.
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
                            <div className="flex h-full items-center justify-center text-xs text-white/25">
                              Pending / no frame
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
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className={`text-[10px] uppercase ${statusTone(shot.status)}`}>
                              {shot.status}
                            </span>
                            {shot.id != null && (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => handleRegenShot(shot)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] disabled:opacity-40"
                              >
                                Regenerate
                                <CreditHint step="regenShot" ctx={estimateCtx} />
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
