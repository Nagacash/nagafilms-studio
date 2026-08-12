'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]';

const navAction =
  `inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--border-color)] bg-white/[0.03] px-3 text-sm text-[var(--text-faint)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--border-primary)] hover:text-[var(--color-primary)] sm:w-auto sm:justify-start sm:border-transparent sm:bg-transparent sm:px-2 ${focusRing}`;

const pagePad =
  'min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] px-4 py-8 pb-[max(2rem,_env(safe-area-inset-bottom))] pt-[max(2rem,_env(safe-area-inset-top))] sm:px-6 sm:py-12';

function AdminSkeleton() {
  return (
    <main className={pagePad}>
      <div className="mx-auto w-full max-w-3xl animate-pulse" aria-busy="true" aria-label="Loading admin">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="h-3 w-16 rounded bg-white/10" />
            <div className="h-8 w-36 rounded bg-white/10 sm:w-40" />
            <div className="h-4 w-full max-w-xs rounded bg-white/5 sm:max-w-md" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <div className="h-11 rounded bg-white/5" />
            <div className="h-11 rounded bg-white/5" />
            <div className="h-11 rounded bg-white/5" />
            <div className="h-11 rounded bg-white/5" />
          </div>
        </div>
        <div className="panel-inset mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-4 sm:mb-6 sm:p-6">
          <div className="mb-2 h-3 w-20 rounded bg-white/10" />
          <div className="h-5 w-full max-w-[12rem] rounded bg-white/10" />
          <div className="mt-2 h-4 w-16 rounded bg-white/5" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2">
          <div className="panel-inset rounded-xl border border-[var(--border-primary)] bg-[var(--bg-panel)] p-5 sm:p-8">
            <div className="mb-3 h-3 w-24 rounded bg-white/10" />
            <div className="mb-4 h-3 w-40 max-w-full rounded bg-white/5" />
            <div className="h-10 w-24 rounded bg-white/10 sm:h-12 sm:w-28" />
          </div>
          <div className="panel-inset rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-5 sm:p-8">
            <div className="mb-3 h-3 w-28 rounded bg-white/10" />
            <div className="mb-4 h-3 w-44 max-w-full rounded bg-white/5" />
            <div className="h-10 w-28 rounded bg-white/10 sm:h-12 sm:w-32" />
          </div>
        </div>
      </div>
    </main>
  );
}

function WalletsMobileList({ wallets }) {
  if (wallets.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--border-color)] px-4 py-8 text-center text-[var(--text-muted)] sm:hidden">
        No wallets yet
      </p>
    );
  }

  return (
    <ul className="space-y-3 sm:hidden" role="list">
      {wallets.map((w) => (
        <li
          key={w.userId}
          className="panel-inset rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-4"
        >
          <p className="min-w-0 break-words font-medium">{w.email || w.userId}</p>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="text-sm text-[var(--text-muted)]">{w.role}</span>
            <span className="font-mono text-base tabular-nums text-[var(--color-primary)]">
              {w.balance}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

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
    return <AdminSkeleton />;
  }

  const muapiDisplay =
    muapi?.balance != null
      ? typeof muapi.balance === 'number'
        ? muapi.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : String(muapi.balance)
      : '—';

  return (
    <main className={pagePad}>
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--color-primary)]/80">
              Admin
            </p>
            <h1 className="text-balance text-2xl font-black tracking-tight sm:text-3xl">Balances</h1>
            <p className="mt-2 max-w-prose text-pretty text-base leading-relaxed text-[var(--text-muted)]">
              Two wallets: <strong className="text-white/70">Naga credits</strong> (what users buy) and{' '}
              <strong className="text-white/70">MuAPI</strong> (what you pay providers with).
            </p>
          </div>
          <nav
            aria-label="Admin actions"
            className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-end"
          >
            <button type="button" onClick={load} className={navAction}>
              Refresh
            </button>
            <Link href="/studio" className={navAction}>
              Studio →
            </Link>
            <Link href="/credits" className={navAction}>
              Buy packs →
            </Link>
            <span className="flex min-h-11 items-stretch [&_button]:min-h-11 [&_button]:w-full [&_button]:justify-center sm:[&_button]:w-auto">
              <LogoutButton />
            </span>
          </nav>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-4 break-words rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:mb-6"
          >
            {error}
          </p>
        )}

        <div className="panel-inset mb-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-4 sm:mb-6 sm:p-6">
          <p className="mb-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">Signed in</p>
          <p className="min-w-0 break-words font-semibold">{me.user?.email}</p>
          <p className="mt-1 text-sm text-[var(--color-primary)]">
            {me.user?.role === 'admin' ? 'Admin' : 'User'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:gap-4 md:grid-cols-2">
          <div className="panel-inset rounded-xl border border-[var(--border-primary)] bg-[var(--bg-panel)] p-5 sm:p-8">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Naga credits</p>
            <p className="mt-1 mb-3 text-sm leading-relaxed text-[var(--text-muted)]">
              App wallet (users / your seeded credits)
            </p>
            <p className="break-all text-4xl font-black tabular-nums text-[var(--color-primary)] sm:text-5xl">
              {me.wallet?.balance ?? 0}
            </p>
          </div>
          <div className="panel-inset rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-5 sm:p-8">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">MuAPI balance</p>
            <p className="mt-1 mb-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Real operator wallet via{' '}
              <code className="break-all text-white/60" translate="no">
                MUAPI_API_KEY
              </code>
            </p>
            <p className="break-all text-4xl font-black tabular-nums text-white sm:text-5xl">
              {muapiDisplay}
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {muapi?.currency || 'USD'} · live from MuAPI
            </p>
            {muapiError && (
              <p role="alert" className="mt-3 break-words text-xs text-red-400">
                {muapiError}
              </p>
            )}
            <button
              type="button"
              onClick={loadMuapi}
              className={`mt-4 inline-flex min-h-11 items-center text-sm text-[var(--text-faint)] transition-colors duration-[var(--duration-fast)] hover:text-[var(--color-primary)] ${focusRing}`}
            >
              Refresh MuAPI →
            </button>
          </div>
        </div>

        {me.user?.role === 'admin' && (
          <div className="panel-inset mb-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-panel)] p-4 sm:mb-8 sm:p-6">
            <h2 className="mb-3 text-balance text-base font-bold sm:text-lg">
              Seed Naga credits (app wallet only)
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="sr-only" htmlFor="seed-amount">
                Credit amount
              </label>
              <input
                id="seed-amount"
                name="seedAmount"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                value={seedAmount}
                onChange={(e) => setSeedAmount(e.target.value)}
                className={`w-full min-h-11 rounded-md border border-[var(--border-color)] bg-white/5 px-3 py-2 text-base tabular-nums transition-colors duration-[var(--duration-fast)] focus-visible:border-[var(--border-primary)] sm:w-32 sm:text-sm ${focusRing}`}
              />
              <button
                type="button"
                disabled={busy}
                onClick={seedSelf}
                className={`min-h-11 w-full rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-black transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${focusRing}`}
              >
                {busy ? 'Adding…' : 'Add Naga credits'}
              </button>
            </div>
          </div>
        )}

        {me.user?.role === 'admin' && (
          <section>
            <h2 className="mb-3 text-balance text-base font-bold sm:text-lg">All Naga wallets</h2>

            <WalletsMobileList wallets={wallets} />

            <div className="panel-inset hidden overflow-x-auto rounded-xl border border-[var(--border-color)] sm:block">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="bg-white/5 text-left text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 text-right font-medium">Naga credits</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">
                        No wallets yet
                      </td>
                    </tr>
                  ) : (
                    wallets.map((w) => (
                      <tr
                        key={w.userId}
                        className="border-t border-white/5 transition-colors duration-[var(--duration-fast)] hover:bg-white/[0.03]"
                      >
                        <td className="max-w-[14rem] truncate px-4 py-3 lg:max-w-none lg:whitespace-normal lg:break-words">
                          {w.email || w.userId}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{w.role}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--color-primary)]">
                          {w.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
