'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(data.error || 'Signup failed');
      return;
    }
    const login = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (login?.error) {
      router.push('/login');
      return;
    }
    await update();
    router.replace('/credits');
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-white/10 bg-[#0a0a0a] rounded-xl p-8">
        <h1 className="text-xl font-bold mb-1">Create account</h1>
        <p className="text-white/40 text-sm mb-8">Buy credit packs after signup — no subscription, no API key.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Password (min 8)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-white/35">
            By signing up you agree to the{' '}
            <Link href="/terms" className="text-[#00ff88]">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/policy" className="text-[#00ff88]">
              Privacy Policy
            </Link>
            . Studio outputs are AI-generated.
          </p>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#00ff88] text-black font-bold py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-white/35">
          Already have an account?{' '}
          <Link href="/login" className="text-[#00ff88]">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
