'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageStudio, VideoStudio, LipSyncStudio, CinemaStudio, MarketingStudio, getUserBalance } from 'studio';
import axios from 'axios';
import ApiKeyModal from './ApiKeyModal';
import LogoutButton, { logoutEverywhere } from './LogoutButton';

const TABS = [
  { id: 'image', label: 'Image Studio' },
  { id: 'video', label: 'Video Studio' },
  { id: 'lipsync', label: 'Lip Sync' },
  { id: 'cinema', label: 'Cinema Studio' },
  { id: 'marketing', label: 'Marketing Studio' },
];

const STORAGE_KEY = 'muapi_key';
const SESSION_KEY = 'session';

export default function StandaloneShell() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug || [];

  const getInitialTab = () => {
    const firstSegment = slug[0];
    if (firstSegment && TABS.find((t) => t.id === firstSegment)) return firstSegment;
    return 'image';
  };

  const [apiKey, setApiKey] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'saas' | 'byo'
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [balance, setBalance] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState(null);

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

  const fetchSaasBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.wallet?.balance ?? 0;
    } catch (err) {
      console.error('Naga balance fetch failed:', err);
      return null;
    }
  }, []);

  const fetchByoBalance = useCallback(async (key) => {
    try {
      const data = await getUserBalance(key);
      return data.balance;
    } catch (err) {
      console.error('MuAPI balance fetch failed:', err);
      return null;
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (authMode === 'saas') {
      const bal = await fetchSaasBalance();
      if (bal != null) setBalance(bal);
    } else if (apiKey && apiKey !== SESSION_KEY) {
      const bal = await fetchByoBalance(apiKey);
      if (bal != null) setBalance(bal);
    }
  }, [authMode, apiKey, fetchSaasBalance, fetchByoBalance]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setHasMounted(true);

      try {
        const meRes = await fetch('/api/me', { credentials: 'include' });
        if (meRes.ok) {
          const me = await meRes.json();
          if (!cancelled) {
            setAuthMode('saas');
            setApiKey(SESSION_KEY);
            setBalance(me.wallet?.balance ?? 0);
            setInitDone(true);
          }
          return;
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (!cancelled) {
          setAuthMode('byo');
          setApiKey(stored);
          document.cookie = `muapi_key=${encodeURIComponent(stored)}; path=/; max-age=31536000; SameSite=Lax`;
        }
        const bal = await fetchByoBalance(stored);
        if (!cancelled) {
          if (bal != null) setBalance(bal);
          setInitDone(true);
        }
        return;
      }

      if (!cancelled) setInitDone(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fetchByoBalance]);

  const handleKeySave = useCallback(
    (key) => {
      localStorage.setItem(STORAGE_KEY, key);
      setAuthMode('byo');
      setApiKey(key);
      fetchByoBalance(key).then((bal) => {
        if (bal != null) setBalance(bal);
      });
      document.cookie = `muapi_key=${encodeURIComponent(key)}; path=/; max-age=31536000; SameSite=Lax`;
    },
    [fetchByoBalance]
  );

  const handleKeyChange = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setAuthMode(null);
    setBalance(null);
    document.cookie = 'muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }, []);

  const handleLogout = useCallback(() => {
    setApiKey(null);
    setAuthMode(null);
    setBalance(null);
    setShowSettings(false);
    logoutEverywhere({ redirectTo: '/' });
  }, []);

  useEffect(() => {
    delete axios.defaults.headers.common['x-api-key'];
    if (!apiKey) return;

    const interceptorId = axios.interceptors.request.use((config) => {
      const isRelative = config.url.startsWith('/') || !config.url.startsWith('http');
      const isInternalProxy =
        config.url.includes('/api/api') || config.url.includes('/api/v1');
      if (isRelative || isInternalProxy) {
        config.headers['x-api-key'] = apiKey;
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptorId);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !initDone) return;
    refreshBalance();
    const interval = setInterval(refreshBalance, 30000);
    return () => clearInterval(interval);
  }, [apiKey, initDone, refreshBalance]);

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
    balance !== null
      ? authMode === 'saas'
        ? `${balance.toLocaleString()} cr`
        : `$${balance}`
      : '…';

  if (!hasMounted || !initDone) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin text-[#00ff88] text-3xl">◌</div>
      </div>
    );
  }

  if (!apiKey) {
    return <ApiKeyModal onSave={handleKeySave} />;
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

      <header className="flex-shrink-0 h-14 border-b border-white/[0.03] flex items-center justify-between px-6 bg-black/20 backdrop-blur-md z-40">
        <div className="flex items-center gap-3">
          <img src="/naga-mark.svg" alt="Naga Films" className="w-9 h-9 object-contain" />
          <span className="text-sm font-bold tracking-tight hidden lg:block">
            NAGA FILMS <span className="text-white/40 font-medium">Studio</span>
          </span>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative py-4 text-[13px] font-medium transition-all whitespace-nowrap px-1 ${
                activeTab === tab.id ? 'text-[#00ff88]' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00ff88] rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 transition-colors">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/35 uppercase tracking-wider leading-none">
                {authMode === 'saas' ? 'Naga credits' : 'MuAPI balance'}
              </span>
              <span className="text-xs font-bold text-white/90">{balanceLabel}</span>
            </div>
          </div>

          {authMode === 'saas' && (
            <Link
              href="/credits"
              className="text-[12px] font-semibold text-[#00ff88]/80 hover:text-[#00ff88] transition-colors hidden sm:block"
            >
              Buy credits
            </Link>
          )}

          <button
            onClick={() => setShowSettings(true)}
            title="Settings — API key, preferences"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <span>Settings</span>
          </button>
          <LogoutButton />
        </div>
      </header>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'image' && (
          <ImageStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'video' && (
          <VideoStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'lipsync' && (
          <LipSyncStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
        {activeTab === 'cinema' && <CinemaStudio apiKey={apiKey} />}
        {activeTab === 'marketing' && (
          <MarketingStudio apiKey={apiKey} droppedFiles={droppedFiles} onFilesHandled={handleFilesHandled} />
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-2">Settings</h2>
            <p className="text-white/40 text-[13px] mb-8">
              {authMode === 'saas'
                ? 'Signed in with Naga credits. Generations use your studio wallet.'
                : 'Manage your AI studio preferences and authentication.'}
            </p>

            <div className="space-y-4 mb-8">
              {authMode === 'byo' ? (
                <div className="bg-white/5 border border-white/[0.03] rounded-md p-4">
                  <label className="block text-xs font-bold text-white/30 mb-2">Active API Key</label>
                  <div className="text-[13px] font-mono text-white/80">
                    {apiKey.slice(0, 8)}••••••••••••••••
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/[0.03] rounded-md p-4">
                  <label className="block text-xs font-bold text-white/30 mb-2">Billing mode</label>
                  <div className="text-[13px] text-white/80">Naga credits (prepaid packs)</div>
                  <p className="text-[11px] text-white/35 mt-2">
                    Model costs are shown in the picker. Failed generations restore credits automatically.
                  </p>
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
              <div className="flex gap-3">
                {authMode === 'byo' && (
                  <button
                    onClick={handleKeyChange}
                    className="flex-1 h-10 rounded-md bg-white/5 text-white/70 hover:bg-white/10 hover:text-white text-xs font-semibold transition-all border border-white/5"
                  >
                    Change Key
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 h-10 rounded-md bg-white/5 text-white/80 hover:bg-white/10 text-xs font-semibold transition-all border border-white/5"
                >
                  Close
                </button>
              </div>
              <p className="text-center text-[11px] text-white/20 pt-1">
                Logging out clears your key and ends your signed-in session.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
