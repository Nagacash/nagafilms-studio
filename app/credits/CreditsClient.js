'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function CreditsClient() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [packs, setPacks] = useState([]);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    fetch('/api/credits/packs')
      .then((r) => r.json())
      .then((d) => setPacks(d.packs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setBalance(d.wallet?.balance ?? 0))
      .catch(() => {});
  }, [status, success]);

  async function buy(packId) {
    setBusy(packId);
    setError('');
    try {
      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Credit packs</h1>
            <p className="mt-2 text-white/45 text-sm">
              One-time purchases only. Credits unlock after Stripe payment. No cash refunds on packs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'authenticated' && <LogoutButton />}
            <Link href="/" className="text-xs text-white/40 hover:text-[#00ff88]">
              ← Home
            </Link>
          </div>
        </div>

        {success && (
          <p className="mb-6 rounded-md border border-[#00ff88]/30 bg-[#00ff88]/10 px-4 py-3 text-sm text-[#00ff88]">
            Payment received. Credits should appear on your balance shortly.
          </p>
        )}
        {canceled && (
          <p className="mb-6 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Checkout canceled — no charge.
          </p>
        )}

        {status === 'authenticated' ? (
          <p className="mb-8 text-sm text-white/60">
            Signed in as {session.user?.email} · Balance:{' '}
            <span className="text-[#00ff88] font-bold">{balance ?? '…'} credits</span>
          </p>
        ) : (
          <p className="mb-8 text-sm text-white/50">
            <Link href="/login" className="text-[#00ff88]">
              Log in
            </Link>{' '}
            or{' '}
            <Link href="/signup" className="text-[#00ff88]">
              sign up
            </Link>{' '}
            to buy packs.
          </p>
        )}

        {error && <p className="mb-4 text-red-400 text-sm">{error}</p>}

        <div className="grid gap-4 md:grid-cols-3">
          {packs.map((p) => (
            <div key={p.id} className="border border-white/10 bg-[#0a0a0a] rounded-xl p-6">
              <h2 className="font-bold text-lg">{p.name}</h2>
              <p className="mt-1 text-3xl font-black text-[#00ff88]">${p.priceUsd}</p>
              <p className="text-xs text-white/35 uppercase tracking-wider">{p.credits} credits</p>
              <p className="mt-3 text-sm text-white/45">{p.blurb}</p>
              <button
                type="button"
                disabled={status !== 'authenticated' || !p.configured || busy === p.id}
                onClick={() => buy(p.id)}
                className="mt-6 w-full rounded-md bg-[#00ff88] text-black font-bold py-2.5 text-sm disabled:opacity-40"
              >
                {!p.configured
                  ? 'Price not configured'
                  : busy === p.id
                    ? 'Redirecting…'
                    : 'Buy with Stripe'}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-xs text-white/30 leading-relaxed">
          Pack purchases are <span className="text-white/50">non-refundable</span> (same idea as{' '}
          <a
            href="https://muapi.ai/refund-policy"
            target="_blank"
            rel="noreferrer"
            className="text-white/50 hover:text-[#00ff88]"
          >
            MuAPI
          </a>
          ). If a generation fails, we restore those credits to your wallet — we do not refund cash to
          your card. After buying, open the{' '}
          <Link href="/studio" className="text-white/50 hover:text-[#00ff88]">
            Studio
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
