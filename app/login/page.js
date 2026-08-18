import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata = { title: 'Log in — Naga Films Studio' };

function LoginFallback() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-white/10 bg-[#0a0a0a] rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Log in</h1>
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
