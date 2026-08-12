"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCharacterSheet,
  trainOmniCharacter,
  uploadFile,
} from "../muapi.js";

const STORAGE_KEY = "naga_character_library_v1";

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLibrary(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 40)));
}

/**
 * Character consistency library — Seedance sheet (@character:) + Omni train (@omni-character:).
 */
export default function CharacterLibrary({ apiKey, onInsertTag }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("sheet"); // sheet | train
  const [name, setName] = useState("");
  const [outfit, setOutfit] = useState("neutral outfit, clean character sheet, multiple angles");
  const [refs, setRefs] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    setEntries(loadLibrary());
  }, []);

  const persist = useCallback((next) => {
    setEntries(next);
    saveLibrary(next);
  }, []);

  const onPickFiles = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const limit = mode === "train" ? 1 : 3;
    const slice = files.slice(0, limit - refs.length);
    setBusy(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of slice) {
        const url = await uploadFile(apiKey, file);
        uploaded.push(url);
      }
      setRefs((prev) => [...prev, ...uploaded].slice(0, limit));
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const create = async () => {
    if (!apiKey) {
      setError("Sign in required");
      return;
    }
    if (!refs.length) {
      setError(mode === "train" ? "Upload one portrait" : "Upload 1–3 reference photos");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "sheet") {
        const res = await createCharacterSheet(apiKey, {
          prompt: outfit.trim() || "character sheet",
          images_list: refs,
          character_name: name.trim() || undefined,
        });
        const id = res.request_id || res.id;
        if (!id) throw new Error("No character sheet id returned");
        const entry = {
          type: "sheet",
          id,
          name: name.trim() || "Character sheet",
          tag: `@character:${id}`,
          thumb: res.url || refs[0],
          createdAt: new Date().toISOString(),
        };
        persist([entry, ...entries]);
        onInsertTag?.(entry.tag);
      } else {
        const res = await trainOmniCharacter(apiKey, {
          image_url: refs[0],
          character_name: name.trim() || "Character",
          description: outfit.trim() || undefined,
        });
        const charId = res.character_id || res.request_id || res.id;
        if (!charId) throw new Error("No trained character id returned");
        const entry = {
          type: "trained",
          id: charId,
          name: name.trim() || "Trained character",
          tag: `@omni-character:${charId}`,
          thumb: refs[0],
          createdAt: new Date().toISOString(),
        };
        persist([entry, ...entries]);
        onInsertTag?.(entry.tag);
      }
      setRefs([]);
      setName("");
    } catch (err) {
      setError(err.message || "Character create failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id) => {
    persist(entries.filter((e) => e.id !== id));
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Character consistency"
        onClick={() => setOpen((v) => !v)}
        className={`h-10 px-3 rounded-full border text-[11px] font-bold tracking-wide transition-colors ${
          open
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-white/10 bg-white/5 text-white/55 hover:border-primary/40 hover:text-primary"
        }`}
      >
        Characters
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 z-50 w-[min(92vw,22rem)] rounded-xl border border-white/10 bg-[#0a0a0a]/95 p-3 shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 mb-2">
            Character consistency
          </p>
          <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
            Create a Seedance sheet or train an Omni identity, then inject{" "}
            <code className="text-white/60">@character:</code> /{" "}
            <code className="text-white/60">@omni-character:</code> into Omni Reference prompts.
          </p>

          <div className="mb-3 flex gap-1 rounded-lg bg-white/[0.03] p-1">
            {[
              ["sheet", "Sheet"],
              ["train", "Train"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setRefs([]);
                  setError("");
                }}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${
                  mode === id ? "bg-primary/20 text-primary" : "text-white/45 hover:text-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-primary/40"
          />
          <input
            value={outfit}
            onChange={(e) => setOutfit(e.target.value)}
            placeholder={mode === "sheet" ? "Outfit / costume for sheet" : "Optional description"}
            className="mb-2 w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-white/25 outline-none focus:border-primary/40"
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={mode === "sheet"}
            className="hidden"
            onChange={onPickFiles}
          />
          <div className="mb-2 flex flex-wrap gap-2">
            {refs.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-12 w-12 rounded-md object-cover border border-white/10"
              />
            ))}
            <button
              type="button"
              disabled={busy || (mode === "train" ? refs.length >= 1 : refs.length >= 3)}
              onClick={() => fileRef.current?.click()}
              className="h-12 min-w-12 rounded-md border border-dashed border-white/15 px-2 text-[10px] text-white/40 hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              + Ref
            </button>
          </div>

          {error && <p className="mb-2 text-[11px] text-red-400">{error}</p>}

          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="mb-3 w-full rounded-md bg-primary py-2 text-xs font-bold text-black disabled:opacity-50"
          >
            {busy ? "Working…" : mode === "sheet" ? "Create sheet" : "Train character"}
          </button>

          <div className="max-h-40 space-y-1.5 overflow-y-auto">
            {entries.length === 0 && (
              <p className="py-3 text-center text-[11px] text-white/30">No saved characters yet</p>
            )}
            {entries.map((e) => (
              <div
                key={`${e.type}-${e.id}`}
                className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2"
              >
                {e.thumb ? (
                  <img src={e.thumb} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded bg-white/5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-white/80">{e.name}</p>
                  <p className="truncate text-[10px] text-white/35">{e.tag}</p>
                </div>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                  onClick={() => onInsertTag?.(e.tag)}
                >
                  Insert
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-1 text-[10px] text-white/30 hover:text-red-300"
                  onClick={() => remove(e.id)}
                  aria-label="Remove character"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
