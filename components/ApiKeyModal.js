'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) { setError('Please enter your API key'); return; }
    onSave(trimmed);
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4 font-inter">
      <div className="w-full max-w-sm bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/10 rounded-xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-14 h-14 bg-[#00ff88]/5 rounded-2xl flex items-center justify-center border border-[#00ff88]/10 mb-6 group hover:border-[#00ff88]/30 transition-colors">
            <img src="/naga-mark.svg" alt="Naga Films" className="w-8 h-8 group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mb-1">
            NAGA FILMS <span className="text-[#00ff88]">Studio</span>
          </h1>
          <p className="text-white/25 text-[11px] tracking-widest uppercase mb-3">Hamburg · Generative Production Stack</p>
          <p className="text-white/40 text-[13px] leading-relaxed px-4">
            Sign in to use your <strong className="text-white/60 font-medium">Naga credits</strong>, or paste a{' '}
            <a href="https://muapi.ai/access-keys" target="_blank" rel="noreferrer" className="text-[#00ff88] hover:text-[#33ffa3] transition-colors">Muapi.ai</a> key for direct billing.
          </p>
        </div>

        <Link
          href="/login?callbackUrl=/studio/image"
          className="flex w-full items-center justify-center bg-[#00ff88] text-black font-medium py-2.5 rounded-md hover:bg-[#33ffa3] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#00ff88]/5 mb-6"
        >
          Log in with Naga credits
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] text-white/25 uppercase tracking-wider">or BYO key</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-white/30 ml-1">
              MuAPI Access Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(''); }}
              placeholder="Paste your key here..."
              className="w-full bg-white/5 border border-white/[0.03] rounded-md px-5 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-[#00ff88]/30 focus:bg-white/[0.07] transition-all"
              suppressHydrationWarning
            />
            {error && <p className="mt-2 text-red-500/80 text-[11px] font-medium ml-1">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-white/5 text-white font-medium py-2.5 rounded-md hover:bg-white/10 border border-white/10 transition-all"
            suppressHydrationWarning
          >
            Continue with API key
          </button>

          <p className="text-center text-[12px] text-white/20 pt-2">
            Need a key?{' '}
            <a href="https://muapi.ai/access-keys" target="_blank" rel="noreferrer" className="text-white/40 hover:text-[#00ff88] transition-colors font-medium">
              Get one free →
            </a>
          </p>

          <p className="text-center text-[12px] pt-1">
            <Link href="/" className="text-white/20 hover:text-white/50 transition-colors">
              ← Back to home
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
