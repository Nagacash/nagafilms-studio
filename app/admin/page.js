'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [muapi, setMuapi] = useState(null);
  const [muapiError, setMuapiError] = useState('');
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seedAmount, setSeedAmount] = useState(1000);

  async function loadMuapi() {
    setMuapiError('');
    try {
      const res = await fetch('/api/admin/muapi');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MuAPI balance failed');
      setMuapi(data);
    } catch (err) {
      setMuapi(null);
      setMuapiError(err.message);
    }
  }

  async function load() {
    setError('');
    const meRes = await fetch('/api/me');
    const meData = await meRes.json();
    if (!meRes.ok) {
      setError(meData.error || 'Not signed in');
      return;
    }
    setMe(meData);

    if (meData.user?.role !== 'admin') {
      setError('Admin only');
      return;
    }

    const wRes = await fetch('/api/admin/credits');
    const wData = await wRes.json();
    if (!wRes.ok) {
      setError(wData.error || 'Failed to load wallets');
      return;
    }
    setWallets(wData.wallets || []);
    await loadMuapi();
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated') load();
  }, [status, router]);

  async function seedSelf() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          amount: Number(seedAmount),
          reason: 'admin self-seed',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading' || !me) {
    return (
      <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        Loading…
      </main>
    );
  }

  const muapiDisplay =
    muapi?.balance != null
      ? typeof muapi.balance === 'number'
        ? muapi.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : String(muapi.balance)
      : '—';

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00ff88]/70 mb-2">Admin</p>
            <h1 className="text-3xl font-black tracking-tight">Balances</h1>
            <p className="mt-2 text-sm text-white/45">
              Two wallets: <strong className="text-white/70">Naga credits</strong> (what users buy) and{' '}
              <strong className="text-white/70">MuAPI</strong> (what you pay providers with).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button type="button" onClick={load} className="text-white/50 hover:text-[#00ff88]">
              Refresh
            </button>
            <Link href="/studio" className="text-white/50 hover:text-[#00ff88]">
              Studio →
            </Link>
            <Link href="/credits" className="text-white/50 hover:text-[#00ff88]">
              Buy packs →
            </Link>
            <LogoutButton />
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-6 mb-6">
          <p className="text-xs text-white/35 uppercase tracking-wider mb-1">Signed in</p>
          <p className="font-semibold">{me.user?.email}</p>
          <p className="mt-1 text-sm text-[#00ff88]">{me.user?.role === 'admin' ? 'Admin' : 'User'}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-[#00ff88]/25 bg-[#0a0a0a] p-8">
            <p className="text-xs text-white/35 uppercase tracking-wider">Naga credits</p>
            <p className="text-[13px] text-white/40 mt-1 mb-3">App wallet (users / your seeded credits)</p>
            <p className="text-5xl font-black text-[#00ff88]">{me.wallet?.balance ?? 0}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-8">
            <p className="text-xs text-white/35 uppercase tracking-wider">MuAPI balance</p>
            <p className="text-[13px] text-white/40 mt-1 mb-3">
              Real operator wallet via <code className="text-white/50">MUAPI_API_KEY</code>
            </p>
            <p className="text-5xl font-black text-white">{muapiDisplay}</p>
            <p className="mt-2 text-xs text-white/35">{muapi?.currency || 'USD'} · live from MuAPI</p>
            {muapiError && <p className="mt-3 text-xs text-red-400">{muapiError}</p>}
            <button
              type="button"
              onClick={loadMuapi}
              className="mt-4 text-xs text-white/50 hover:text-[#00ff88]"
            >
              Refresh MuAPI →
            </button>
          </div>
        </div>

        {me.user?.role === 'admin' && (
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-6 mb-8">
            <h2 className="font-bold mb-3">Seed Naga credits (app wallet only)</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="number"
                value={seedAmount}
                onChange={(e) => setSeedAmount(e.target.value)}
                className="w-32 rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={seedSelf}
                className="rounded-md bg-[#00ff88] text-black font-bold px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy ? 'Adding…' : 'Add Naga credits'}
              </button>
            </div>
          </div>
        )}

        {me.user?.role === 'admin' && (
          <div>
            <h2 className="font-bold mb-3">All Naga wallets</h2>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium text-right">Naga credits</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.userId} className="border-t border-white/5">
                      <td className="px-4 py-3">{w.email || w.userId}</td>
                      <td className="px-4 py-3 text-white/40">{w.role}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#00ff88]">{w.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
