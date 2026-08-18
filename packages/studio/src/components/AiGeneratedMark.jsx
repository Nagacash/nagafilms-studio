/** Visible Art. 50 origin mark for Studio outputs. */

export function AiGeneratedMark({ className = '' }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-black bg-[#00ff88] ${className}`}
    >
      AI-generated
    </span>
  );
}

export function AiFullscreenCaption() {
  return (
    <p className="pointer-events-none absolute bottom-6 left-1/2 z-[101] w-[min(90vw,36rem)] -translate-x-1/2 text-center text-[11px] leading-relaxed text-white/55">
      AI-generated or AI-manipulated. Disclose deepfakes when you publish.
    </p>
  );
}
