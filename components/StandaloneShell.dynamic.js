'use client';

import dynamic from 'next/dynamic';

function StudioLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505]">
      <div className="animate-spin text-3xl text-[#00ff88]">◌</div>
    </div>
  );
}

/**
 * Client-only shell — avoids Next server/static worker from resolving axios vendor
 * chunks during RSC prerender (fixes missing ./vendor-chunks/axios.js on some builds).
 */
const StandaloneShell = dynamic(() => import('./StandaloneShell'), {
  ssr: false,
  loading: () => <StudioLoadingShell />,
});

export default StandaloneShell;
