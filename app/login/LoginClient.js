'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeCallbackUrl } from '@/lib/safe-callback-url';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, update } = useSession();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    router.replace(callbackUrl);
    router.refresh();
  }, [status, callbackUrl, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError('Invalid email or password');
      return;
    }
    await update();
    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-white/10 bg-[#0a0a0a] rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Log in</h1>
        <p className="text-white/40 text-sm mb-8">Access Naga Films Studio with your account.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading || status === 'authenticated'}
            className="w-full rounded-md bg-[#00ff88] text-black font-bold py-2.5 text-sm disabled:opacity-60"
          >
            {status === 'authenticated' ? 'Continuing…' : loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-white/35">
          No account?{' '}
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-[#00ff88]"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-xs">
          <Link href={callbackUrl === '/studio' ? '/' : callbackUrl} className="text-white/25 hover:text-white/50">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}
