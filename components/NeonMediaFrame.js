'use client';

/**
 * Shared neon media treatment from the landing hero — clean clip, soft gradients, glow orbs.
 */

export const NEON_MEDIA_CLASS = 'h-full w-full scale-[1.04] object-cover';

export function NeonMediaOverlays({ compact = false }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0812]/95 via-[#0a0812]/45 to-[#ff6ec7]/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0812]/75 via-[#0a0812]/20 to-transparent" />
      {!compact && (
        <>
          <div className="pointer-events-none absolute -top-10 left-1/4 h-32 w-40 rounded-full bg-[#ff6ec7]/[0.12] blur-[80px] sm:h-40 sm:w-52 sm:blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-24 w-32 rounded-full bg-[#00d4ff]/[0.08] blur-[70px] sm:h-28 sm:w-36" />
        </>
      )}
    </>
  );
}

export function NeonMediaCaption({ children }) {
  if (!children) return null;
  return (
    <span className="absolute bottom-3 right-4 z-10 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#00ff88]/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
      {children}
    </span>
  );
}
