'use client';

import Link from 'next/link';

/** Shown when visiting /studio without a signed-in session. */
export default function StudioLoginGate() {
  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4 font-inter">
      <div className="w-full max-w-sm bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-[#00ff88]/5 rounded-2xl flex items-center justify-center border border-[#00ff88]/10 mb-6">
            <img src="/assets/NAGA_round.png" alt="Naga Films" className="h-8 w-8 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mb-1">
            NAGA FILMS <span className="text-[#00ff88]">Studio</span>
          </h1>
          <p className="text-white/25 text-[11px] tracking-widest uppercase mb-3">
            Hamburg · Generative Production Stack
          </p>
          <p className="text-white/40 text-[13px] leading-relaxed px-4">
            Sign in to use your <strong className="text-white/60 font-medium">Naga credits</strong>.
            Buy packs, pick models, generate — no MuAPI key needed.
          </p>
        </div>

        <Link
          href="/login?callbackUrl=/studio/image"
          className="flex w-full items-center justify-center bg-[#00ff88] text-black font-medium py-2.5 rounded-md hover:bg-[#33ffa3] transition-all shadow-lg shadow-[#00ff88]/5 mb-4"
        >
          Log in
        </Link>

        <Link
          href="/signup"
          className="flex w-full items-center justify-center bg-white/5 text-white/80 font-medium py-2.5 rounded-md hover:bg-white/10 border border-white/10 transition-all mb-6"
        >
          Create account
        </Link>

        <p className="text-center text-[12px] pt-1">
          <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
