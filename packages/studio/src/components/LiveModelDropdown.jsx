"use client";

import { useState } from "react";
import { useLiveModels, creditLabel } from "../useLiveModels.js";

function CheckSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ModelRow({ model, selected, onSelect, onClose, accent = "primary" }) {
  const credits = creditLabel(model);
  const accentClass =
    accent === "orange"
      ? "bg-orange-500/10 text-orange-400"
      : "bg-primary/10 text-primary";

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(model);
        onClose();
      }}
      className={`flex items-center justify-between p-3.5 hover:bg-white/5 rounded-lg cursor-pointer transition-all border border-transparent hover:border-white/5 ${
        selected === model.id ? "bg-white/5 border-white/5" : ""
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 shrink-0 ${accentClass} border border-white/5 rounded-full flex items-center justify-center font-bold text-xs shadow-inner uppercase`}
        >
          {model.name.charAt(0)}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-white tracking-tight truncate">{model.name}</span>
          <span className="text-[10px] text-white/35 font-mono truncate">{model.id}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {credits && (
          <span className="text-[10px] font-semibold text-[#00ff88]/80 whitespace-nowrap">{credits}</span>
        )}
        {selected === model.id && <CheckSvg />}
      </div>
    </div>
  );
}

function ModelSection({ title, models, search, selectedModel, onSelect, onClose, accent }) {
  const lf = search.toLowerCase();
  const filtered = models.filter(
    (m) => m.name.toLowerCase().includes(lf) || m.id.toLowerCase().includes(lf),
  );

  if (!filtered.length) return null;

  return (
    <>
      {title && (
        <div className="text-xs font-bold text-secondary px-1 py-2 shrink-0 border-t border-white/5 first:border-t-0">
          {title}
        </div>
      )}
      {filtered.map((m) => (
        <ModelRow
          key={m.id}
          model={m}
          selected={selectedModel}
          onSelect={onSelect}
          onClose={onClose}
          accent={accent}
        />
      ))}
    </>
  );
}

/**
 * Live MuAPI model picker with Naga credit estimates.
 */
export default function LiveModelDropdown({
  category,
  secondaryCategory = null,
  secondaryLabel = null,
  selectedModel,
  onSelect,
  onClose,
  fallbackModels = [],
  secondaryFallback = [],
  listTitle = "Available models",
}) {
  const [search, setSearch] = useState("");
  const { models, loading, error, source } = useLiveModels(category);
  const secondary = useLiveModels(secondaryCategory || '', {
    enabled: Boolean(secondaryCategory),
  });

  const primaryModels = models.length ? models : fallbackModels;
  const secondaryModels = secondary.models.length ? secondary.models : secondaryFallback;
  const totalCount = primaryModels.length + secondaryModels.length;

  return (
    <div className="flex flex-col gap-2 h-full max-h-[60vh]">
      <div className="border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 focus-within:border-primary/50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs text-white focus:ring-0 w-full p-0 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-medium text-secondary py-1 shrink-0 px-1">
        <span>{listTitle}</span>
        <span className="text-white/25">
          {loading ? "syncing…" : `${totalCount} live`}
          {source === "static" && " (offline)"}
        </span>
      </div>

      {error && (
        <p className="text-[10px] text-amber-400/80 px-1 shrink-0">
          Could not refresh catalog — using fallback list.
        </p>
      )}

      <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar pr-1 pb-2">
        <ModelSection
          models={primaryModels}
          search={search}
          selectedModel={selectedModel}
          onSelect={onSelect}
          onClose={onClose}
        />
        {secondaryCategory && (
          <ModelSection
            title={secondaryLabel || "More models"}
            models={secondaryModels}
            search={search}
            selectedModel={selectedModel}
            onSelect={onSelect}
            onClose={onClose}
            accent="orange"
          />
        )}
      </div>
    </div>
  );
}
