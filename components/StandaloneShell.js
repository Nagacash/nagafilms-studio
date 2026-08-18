'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, MarketingStudio, StoryboardStudio } from 'studio';
import axios from 'axios';
import StudioLoginGate from './StudioLoginGate';
import LogoutButton, { logoutEverywhere } from './LogoutButton';
import StudioTabMoodStrip from './StudioTabMoodStrip';
import { STUDIO_AESTHETICS } from '@/lib/studio-aesthetics';

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
    blurb: 'Make a face talk — match mouth movement to your audio. Disclose deepfakes when you publish.',
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
const LOCAL_GALLERY_TABS = new Set(['image', 'video', 'lipsync', 'cinema', 'marketing']);
const LOCAL_STORAGE_NOTICE =
  'We do not store your images or clips on our servers. Gallery history lives in this browser only — always download files you want to keep.';
const AI_ORIGIN_NOTICE =
  'Outputs are AI-generated or AI-manipulated. If you publish a deepfake of a real person, disclose that.';

// localStorage key + history field for each tab's gallery count
const GALLERY_PERSIST = {
  image:     { key: 'hg_image_studio_persistent',     field: 'localHistory' },
  video:     { key: 'hg_video_studio_persistent',     field: 'localHistory' },
  lipsync:   { key: 'hg_lipsync_studio_persistent',   field: 'internalHistory' },
  cinema:    { key: 'hg_cinema_studio_persistent',    field: 'internalHistory' },
  marketing: { key: 'hg_marketing_studio_persistent', field: 'history' },
};

function readGalleryCounts() {
  const counts = {};
  for (const [tabId, { key, field }] of Object.entries(GALLERY_PERSIST)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { counts[tabId] = 0; continue; }
      const data = JSON.parse(raw);
      counts[tabId] = Array.isArray(data[field]) ? data[field].length : 0;
    } catch {
      counts[tabId] = 0;
    }
  }
  return counts;
}

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
    <div className="studio-ambient flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
      <div className="relative z-10 animate-spin text-3xl text-[#ff6ec7]">◌</div>
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
  const [galleryCounts, setGalleryCounts] = useState({});
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

  // ── Gallery counts from localStorage ─────────────────────────────────────
  useEffect(() => {
    setGalleryCounts(readGalleryCounts());

    // cross-tab updates
    const onStorage = (e) => {
      const watched = Object.values(GALLERY_PERSIST).map((p) => p.key);
      if (!e.key || watched.includes(e.key)) {
        setGalleryCounts(readGalleryCounts());
      }
    };
    window.addEventListener('storage', onStorage);

    // same-tab polling: studios write after a 500 ms debounce, so 2 s is plenty
    const pollId = setInterval(() => setGalleryCounts(readGalleryCounts()), 2000);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(pollId);
    };
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
      className="studio-ambient relative flex h-screen flex-col overflow-hidden bg-[var(--bg-app)] text-white"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center border-4 border-dashed border-[#ff6ec7]/50 bg-[#ff6ec7]/10 backdrop-blur-md transition-all duration-300">
          <div className="flex scale-110 animate-pulse flex-col items-center gap-4 rounded-3xl border border-[#ff6ec7]/25 bg-[var(--bg-panel)]/95 p-8 shadow-2xl shadow-[#ff6ec7]/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6ec7] to-[#00ff88]">
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

      <header className="relative z-40 grid h-16 flex-shrink-0 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-[#ff6ec7]/15 bg-[var(--bg-panel)]/90 px-6 backdrop-blur-md lg:gap-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/assets/NAGA_round.png" alt="Naga Films" className="h-8 w-8 object-contain drop-shadow-[0_0_12px_rgba(255,110,199,0.35)]" />
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.12em] lg:block">
            Naga Films <span className="font-medium text-[#ffb8e8]/70">Studio</span>
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
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? 'bg-[#00ff88] text-black shadow-[0_0_20px_rgba(0,255,136,0.25)]'
                    : 'text-white/55 hover:bg-[#ff6ec7]/10 hover:text-[#ffb8e8]'
                }`}
              >
                {tab.label}
                {galleryCounts[tab.id] > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0 text-[9px] font-bold tabular-nums leading-[1.6] ${
                      isActive ? 'bg-black/20 text-black/70' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {galleryCounts[tab.id]}
                  </span>
                )}
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
                  : 'border-[#ff6ec7]/20 bg-[#ff6ec7]/5 hover:border-[#ff6ec7]/35 hover:bg-[#ff6ec7]/8'
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
            className="inline-flex items-center border border-[#ff6ec7]/20 bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75 transition-colors hover:border-[#ff6ec7]/40 hover:text-[#ffb8e8]"
          >
            Settings
          </button>
          <LogoutButton
            className="inline-flex items-center gap-2 border border-[#ff6ec7]/15 bg-transparent px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55 transition-colors hover:border-[#ff6ec7]/35 hover:text-[#ffb8e8]"
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
        <div className="relative z-10 flex-shrink-0 border-b border-[#ff6ec7]/12 bg-[var(--bg-panel)]/85 backdrop-blur-sm">
          {/* Main info row */}
          <div className="flex items-center justify-between gap-4 px-6 py-2.5 lg:px-8">
            {/* Left: label chip + blurb */}
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 border border-[#ff6ec7]/35 bg-[#ff6ec7]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffb8e8]">
                {activeTabMeta.label}
              </span>
              <span className="truncate text-[12px] text-white/65">
                {activeTabMeta.blurb}
              </span>
            </div>
            {/* Right: numbered steps */}
            <p className="hidden shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-white/35 sm:block">
              {activeTabMeta.howTo}
            </p>
          </div>
          {/* Local-only notice — slim strip */}
          {LOCAL_GALLERY_TABS.has(activeTab) && (
            <div className="flex items-center gap-2 border-t border-white/[0.06] bg-amber-500/[0.04] px-6 py-1.5 lg:px-8">
              <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400/70" />
              <p className="text-[10px] leading-snug text-amber-100/50">
                <span className="font-semibold text-amber-200/70">Local only — </span>
                {LOCAL_STORAGE_NOTICE}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.06] px-6 py-1.5 lg:px-8">
            <p className="text-[10px] leading-snug text-white/40">
              {AI_ORIGIN_NOTICE}{' '}
              <Link href="/terms" className="text-white/55 underline underline-offset-2 hover:text-[#00ff88]">
                Terms
              </Link>
              {' · '}
              <Link href="/policy#eu-ai-act" className="text-white/55 underline underline-offset-2 hover:text-[#00ff88]">
                AI Act
              </Link>
            </p>
          </div>
          {/* Mobile studio picker */}
          <div className="flex gap-1 overflow-x-auto px-6 pb-2 pt-1.5 md:hidden lg:px-8">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                    isActive
                      ? 'bg-[#00ff88] text-black shadow-[0_0_16px_rgba(0,255,136,0.2)]'
                      : 'border border-[#ff6ec7]/15 text-white/55 hover:border-[#ff6ec7]/30 hover:text-[#ffb8e8]'
                  }`}
                >
                  {tab.label}
                  {galleryCounts[tab.id] > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0 text-[9px] font-bold tabular-nums leading-[1.6] ${
                        isActive ? 'bg-black/20 text-black/70' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {galleryCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <StudioTabMoodStrip aesthetic={STUDIO_AESTHETICS[activeTab]} />

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0812]/70 backdrop-blur-md animate-fade-in-up">
          <div className="w-full max-w-sm rounded-xl border border-[#ff6ec7]/20 bg-[var(--bg-panel)] p-8 shadow-2xl shadow-[#ff6ec7]/10">
            <h2 className="mb-2 text-lg font-bold text-white">Settings</h2>
            <p className="mb-8 text-[13px] text-white/55">
              Your studio wallet and account preferences.
            </p>

            <div className="mb-8 space-y-4">
              <div className="rounded-md border border-[#ff6ec7]/15 bg-[#ff6ec7]/5 p-4">
                <label className="mb-2 block text-xs font-bold text-[#ffb8e8]/80">Your balance</label>
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

              <div className="bg-amber-500/5 border border-amber-500/15 rounded-md p-4">
                <label className="block text-xs font-bold text-amber-200/80 mb-2">
                  Gallery history
                </label>
                <p className="text-[11px] leading-relaxed text-white/45">
                  Images and clips from Image, Video, Lip Sync, Cinema, and Marketing studios are{' '}
                  <strong className="text-white/60">not stored on our servers</strong>. They stay in
                  this browser&apos;s local storage only. Clearing site data, switching devices, or
                  using another browser removes them. Download anything you want to keep.
                </p>
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
