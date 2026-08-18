'use client';

import Link from 'next/link';

/** Shown when visiting /studio without a signed-in session. */
export default function StudioLoginGate() {
  return (
    <div className="studio-ambient relative flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-4 font-inter">
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-[#ff6ec7]/20 bg-[var(--bg-panel)]/90 p-10 shadow-2xl shadow-[#ff6ec7]/10 backdrop-blur-xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff6ec7]/25 bg-[#ff6ec7]/10">
            <img src="/assets/NAGA_round.png" alt="Naga Films" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="mb-1 text-xl font-bold tracking-tight text-white">
            NAGA FILMS <span className="text-[#ffb8e8]">Studio</span>
          </h1>
          <p className="mb-3 text-[11px] uppercase tracking-widest text-white/40">
            Hamburg · Generative Production Stack
          </p>
          <p className="px-4 text-[13px] leading-relaxed text-white/55">
            Sign in to use your <strong className="font-medium text-white/75">Naga credits</strong>.
            Buy packs, pick models, generate — no API key.
          </p>
        </div>

        <Link
          href="/login?callbackUrl=/studio/image"
          className="mb-4 flex w-full items-center justify-center rounded-md bg-[#00ff88] py-2.5 font-medium text-black shadow-lg shadow-[#00ff88]/20 transition-all hover:bg-[#33ffa3]"
        >
          Log in
        </Link>

        <Link
          href="/signup"
          className="mb-6 flex w-full items-center justify-center rounded-md border border-[#ff6ec7]/25 bg-[#ff6ec7]/8 py-2.5 font-medium text-white/85 transition-all hover:border-[#ff6ec7]/40 hover:bg-[#ff6ec7]/12"
        >
          Create account
        </Link>

        <p className="pt-1 text-center text-[12px]">
          <Link href="/" className="text-white/35 transition-colors hover:text-[#ffb8e8]">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
