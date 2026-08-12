'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, MarketingStudio, StoryboardStudio } from 'studio';
import axios from 'axios';
import StudioLoginGate from './StudioLoginGate';
import LogoutButton, { logoutEverywhere } from './LogoutButton';

const TABS = [
  {
    id: 'image',
    label: 'Image',
    blurb: 'Still images from a text prompt, or edit an existing picture.',
    howTo: '1) Pick a model  2) Write a prompt  3) Optional: add a reference image  4) Generate',
  },
  {
    id: 'video',
    label: 'Video',
    blurb: 'Clips from text, or animate a starting frame into motion.',
    howTo: '1) Pick a model  2) Write a prompt  3) Optional: upload a start frame  4) Generate',
  },
  {
    id: 'lipsync',
    label: 'Lip Sync',
    blurb: 'Make a face talk — match mouth movement to your audio.',
    howTo: '1) Upload a portrait or video  2) Upload audio  3) Pick a model  4) Generate',
  },
  {
    id: 'cinema',
    label: 'Cinema',
    blurb: 'Cinematic stills with camera, lens, and framing controls.',
    howTo: '1) Set camera / lens / aperture  2) Write the shot  3) Generate',
  },
  {
    id: 'storyboard',
    label: 'Storyboard',
    blurb: 'Build a multi-episode board step by step (library → shots → PDF).',
    howTo: '1) Create a project  2) Generate library  3) Generate shots  4) Export PDF',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    blurb: 'Product and brand ads with reference-driven consistency.',
    howTo: '1) Add product / brand refs  2) Describe the ad  3) Generate',
  },
];

const STORAGE_KEY = 'muapi_key';
const SESSION_KEY = 'session';
const LOW_CREDITS_THRESHOLD = 100;

function clearByoKey() {
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = 'muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

function animateBalance(from, to, onTick) {
  if (from == null || to == null || from === to) {
    onTick(to);
    return undefined;
  }
  const start = performance.now();
  const duration = 520;
  let frameId;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    onTick(Math.round(from + (to - from) * eased));
    if (t < 1) frameId = requestAnimationFrame(step);
  };
  frameId = requestAnimationFrame(step);
  return () => {
    if (frameId) cancelAnimationFrame(frameId);
  };
}

function StudioLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505]">
      <div className="animate-spin text-3xl text-[#00ff88]">◌</div>
    </div>
  );
}

export default function StandaloneShell() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const slug = params?.slug || [];

  const getInitialTab = () => {
    const firstSegment = slug[0];
    if (firstSegment && TABS.find((t) => t.id === firstSegment)) return firstSegment;
    return 'image';
  };

  const [apiKey, setApiKey] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [balance, setBalance] = useState(null);
  const [displayBalance, setDisplayBalance] = useState(null);
  const [recentDelta, setRecentDelta] = useState(null);
  const [muapiOperatorBalance, setMuapiOperatorBalance] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);
  const deltaTimerRef = useRef(null);
  const walletAbortRef = useRef(null);
  const walletRefreshTimerRef = useRef(null);

  useEffect(() => {
    const firstSegment = slug[0];
    if (firstSegment && TABS.find((t) => t.id === firstSegment)) {
      setActiveTab(firstSegment);
    }
  }, [slug]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push(`/studio/${tabId}`);
  };

  const loadWallet = useCallback(async () => {
    if (walletAbortRef.current) {
      walletAbortRef.current.abort();
    }
    const controller = new AbortController();
    walletAbortRef.current = controller;

    try {
      const res = await fetch('/api/me', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401) {
          setBalance(null);
          setDisplayBalance(null);
        }
        return null;
      }
      const data = await res.json();
      setIsAdmin(data.user?.role === 'admin');
      const next =
        typeof data.wallet?.balance === 'number' ? data.wallet.balance : 0;
      setBalance(next);
      setDisplayBalance(next);
      return data;
    } catch (err) {
      if (controller.signal.aborted || err?.name === 'AbortError') return null;
      return null;
    } finally {
      if (walletAbortRef.current === controller) {
        walletAbortRef.current = null;
      }
    }
  }, []);

  const scheduleWalletRefresh = useCallback(() => {
    if (walletRefreshTimerRef.current) {
      window.clearTimeout(walletRefreshTimerRef.current);
    }
    walletRefreshTimerRef.current = window.setTimeout(() => {
      void loadWallet();
    }, 1500);
  }, [loadWallet]);

  const loadMuapiOperatorBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/muapi', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return null;
      return data.balance;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      clearByoKey();
      setApiKey(SESSION_KEY);
      void loadWallet();
      return;
    }

    if (status === 'unauthenticated') {
      setApiKey(null);
      setBalance(null);
      setIsAdmin(false);
    }
  }, [status, loadWallet]);

  useEffect(() => {
    if (!showSettings || !isAdmin) return;
    loadMuapiOperatorBalance().then((bal) => {
      if (bal != null) setMuapiOperatorBalance(bal);
    });
  }, [showSettings, isAdmin, loadMuapiOperatorBalance]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(loadWallet, balance != null && balance <= LOW_CREDITS_THRESHOLD ? 15000 : 30000);
    return () => clearInterval(interval);
  }, [status, loadWallet, balance]);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;

    const onWallet = (event) => {
      const detail = event?.detail || {};
      const { walletBalance, costCredits, restoredCredits, phase } = detail;

      if (typeof walletBalance === 'number') {
        setBalance((prev) => {
          if (prev != null && prev !== walletBalance) {
            animateBalance(prev, walletBalance, setDisplayBalance);
          } else {
            setDisplayBalance(walletBalance);
          }
          return walletBalance;
        });
      }

      if (phase === 'hold' && costCredits > 0) {
        setRecentDelta({ amount: -costCredits, label: `−${Number(costCredits).toLocaleString()} cr` });
      } else if (restoredCredits > 0) {
        setRecentDelta({
          amount: restoredCredits,
          label: `+${Number(restoredCredits).toLocaleString()} cr restored`,
        });
      } else if (phase === 'denied') {
        setRecentDelta({ amount: 0, label: 'Insufficient credits' });
      }

      if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current);
      deltaTimerRef.current = window.setTimeout(() => setRecentDelta(null), 2800);

      if (typeof walletBalance !== 'number') {
        scheduleWalletRefresh();
      }
    };

    window.addEventListener('naga:wallet', onWallet);
    return () => {
      window.removeEventListener('naga:wallet', onWallet);
      if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current);
      if (walletRefreshTimerRef.current) window.clearTimeout(walletRefreshTimerRef.current);
      walletAbortRef.current?.abort();
    };
  }, [status, scheduleWalletRefresh]);

  useEffect(() => {
    delete axios.defaults.headers.common['x-api-key'];
    if (status !== 'authenticated') return;

    const interceptorId = axios.interceptors.request.use((config) => {
      const isRelative = config.url.startsWith('/') || !config.url.startsWith('http');
      const isInternalProxy =
        config.url.includes('/api/api') || config.url.includes('/api/v1');
      if (isRelative || isInternalProxy) {
        config.headers['x-api-key'] = SESSION_KEY;
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, [status]);

  const handleLogout = useCallback(async () => {
    clearByoKey();
    setApiKey(null);
    setBalance(null);
    setIsAdmin(false);
    setShowSettings(false);
    await logoutEverywhere({ redirectTo: '/' });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) setDroppedFiles(files);
  }, []);

  const handleFilesHandled = useCallback(() => {
    setDroppedFiles(null);
  }, []);

  const balanceLabel =
    displayBalance !== null
      ? `${Number(displayBalance).toLocaleString()} cr`
      : balance !== null
        ? `${Number(balance).toLocaleString()} cr`
        : '…';
  const isLowCredits =
    balance !== null && balance > 0 && balance <= LOW_CREDITS_THRESHOLD;
  const isEmptyCredits = balance !== null && balance <= 0;
  const activeTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];
  const studioKey = apiKey || SESSION_KEY;

  if (status === 'loading') {
    return <StudioLoadingShell />;
  }

  if (status === 'unauthenticated') {
    return <StudioLoginGate />;
  }

  return (
    <div
      className="h-screen bg-[#030303] flex flex-col overflow-hidden text-white relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-[#00ff88]/10 backdrop-blur-md border-4 border-dashed border-[#00ff88]/50 flex items-center justify-center pointer-events-none transition-all duration-300">
          <div className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center gap-4 scale-110 animate-pulse">
            <div className="w-20 h-20 bg-[#00ff88] rounded-2xl flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">Drop your media here</span>
              <span className="text-sm text-white/40">Images, videos, or audio files</span>
            </div>
          </div>
        </div>
      )}

      <header className="z-40 grid h-16 flex-shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-white/10 bg-[var(--bg-panel,#0a0a0a)] px-6 lg:gap-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/assets/NAGA_round.png" alt="Naga Films" className="h-8 w-8 object-contain" />
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.12em] lg:block">
            Naga Films <span className="font-medium text-white/40">Studio</span>
          </span>
        </div>

        <nav
          className="hidden items-center justify-center gap-1 overflow-x-auto md:flex"
          aria-label="Studios"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                title={`${tab.label}: ${tab.blurb}`}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap rounded-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? 'bg-[#00ff88] text-black'
                    : 'text-white/45 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <Link
            href="/credits"
            title="Wallet balance and credit packs"
            className={`relative flex items-center gap-2 border px-3 py-2 transition-colors ${
              isEmptyCredits
                ? 'border-red-500/40 bg-red-500/10 hover:border-red-400/60'
                : isLowCredits
                  ? 'border-amber-500/35 bg-amber-500/5 hover:border-amber-400/50'
                  : 'border-white/15 bg-transparent hover:border-white/30 hover:bg-white/[0.03]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 ${
                isEmptyCredits || isLowCredits
                  ? 'animate-pulse bg-amber-400'
                  : 'animate-pulse bg-[#00ff88]'
              }`}
              aria-hidden
            />
            <span className="flex flex-col leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">
                Credits
              </span>
              <span
                className={`mt-1 text-[11px] font-bold tabular-nums transition-colors ${
                  isEmptyCredits
                    ? 'text-red-300'
                    : isLowCredits
                      ? 'text-amber-200'
                      : 'text-white/90'
                }`}
              >
                {balanceLabel}
              </span>
            </span>
            {recentDelta && (
              <span
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tabular-nums ${
                  recentDelta.amount >= 0 ? 'text-[#00ff88]' : 'text-red-400'
                }`}
                aria-live="polite"
              >
                {recentDelta.label}
              </span>
            )}
          </Link>

          <Link
            href="/credits"
            title="Buy a one-time credit pack. Credits land in your wallet after checkout."
            className={`hidden px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors sm:inline-flex ${
              isLowCredits || isEmptyCredits
                ? 'animate-pulse bg-amber-400 text-black hover:bg-amber-300'
                : 'bg-[#00ff88] text-black hover:bg-[#33ffa3]'
            }`}
          >
            {isLowCredits || isEmptyCredits ? 'Top up' : 'Buy credits'}
          </Link>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            title="Wallet balance, admin tools, and account settings"
            className="inline-flex items-center border border-white/15 bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            Settings
          </button>
          <LogoutButton
            className="inline-flex items-center gap-2 border border-white/15 bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55 transition-colors hover:border-white/30 hover:text-white"
          />
        </div>
      </header>

      {(isLowCredits || isEmptyCredits) && (
        <div
          className={`flex-shrink-0 border-b px-6 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] lg:px-8 ${
            isEmptyCredits
              ? 'border-red-500/20 bg-red-500/10 text-red-200'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
          }`}
        >
          {isEmptyCredits ? (
            <>
              No credits left —{' '}
              <Link href="/credits" className="underline underline-offset-2 hover:text-white">
                top up to keep generating
              </Link>
            </>
          ) : (
            <>
              Low balance ({balanceLabel}) —{' '}
              <Link href="/credits" className="underline underline-offset-2 hover:text-white">
                buy a credit pack
              </Link>{' '}
              before your next run
            </>
          )}
        </div>
      )}

      {activeTabMeta && (
        <div className="flex-shrink-0 border-b border-white/10 bg-[#050505] px-6 py-3 lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <p className="text-[13px] text-white/70">
              <span className="font-semibold uppercase tracking-[0.1em] text-white/90">
                [ {activeTabMeta.label} ]
              </span>
              <span className="text-white/35"> — </span>
              {activeTabMeta.blurb}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40 sm:text-right">
              {activeTabMeta.howTo}
            </p>
          </div>
          {/* Mobile studio picker */}
          <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5 md:hidden">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`shrink-0 rounded-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    isActive
                      ? 'bg-[#00ff88] text-black'
                      : 'border border-white/10 text-white/45 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {activeTab === 'image' && (
          <ImageStudio apiKey={studioKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'video' && (
          <VideoStudio apiKey={studioKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'lipsync' && (
          <LipSyncStudio apiKey={studioKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'cinema' && <CinemaStudio apiKey={studioKey} />}
        {activeTab === 'storyboard' && <StoryboardStudio apiKey={studioKey} />}
        {activeTab === 'marketing' && (
          <MarketingStudio apiKey={studioKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-2">Settings</h2>
            <p className="text-white/40 text-[13px] mb-8">
              Your studio wallet and account preferences.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-white/5 border border-white/[0.03] rounded-md p-4">
                <label className="block text-xs font-bold text-white/30 mb-2">Your balance</label>
                <div className="text-2xl font-black text-[#00ff88]">{balanceLabel}</div>
                <p className="text-[11px] text-white/35 mt-2">
                  Model costs are shown in the picker. Failed generations restore credits automatically.
                </p>
                <Link
                  href="/credits"
                  className="inline-block mt-3 text-[12px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88]"
                >
                  Buy credit packs →
                </Link>
              </div>

              {isAdmin && (
                <div className="bg-white/5 border border-[#00ff88]/10 rounded-md p-4">
                  <label className="block text-xs font-bold text-[#00ff88]/60 mb-2">
                    MuAPI operator wallet (admin)
                  </label>
                  <div className="text-lg font-bold text-white/90">
                    {muapiOperatorBalance != null
                      ? `$${Number(muapiOperatorBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
                      : 'Loading…'}
                  </div>
                  <p className="text-[11px] text-white/35 mt-2">
                    Server-side provider float — not shown to regular users.
                  </p>
                  <Link
                    href="/admin"
                    className="inline-block mt-3 text-[12px] font-semibold text-white/50 hover:text-[#00ff88]"
                  >
                    Open admin console →
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full h-10 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-red-500/10"
              >
                Log out
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full h-10 rounded-md bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
