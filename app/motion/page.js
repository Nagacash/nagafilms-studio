import Link from 'next/link';
import { auth } from '@/lib/auth';
import { isMotionEnabled } from '@/lib/motion/config';
import { listMotionProjectsForUser } from '@/lib/motion/projects';
import EffectCraftWebLoader from '@/components/EffectCraftWebLoader';

export const metadata = {
  title: 'Motion & VFX — Naga Films',
  description: 'Download Motion & VFX packages, import renders, attach to Film Editor.',
};

export default async function MotionListPage() {
  const enabled = isMotionEnabled();
  const session = await auth();

  let projects = [];
  let error = null;
  if (enabled && session?.user?.id) {
    try {
      projects = await listMotionProjectsForUser(session.user.id);
    } catch (err) {
      error = err.message || 'Failed to load Motion projects';
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/NAGA_round.png"
              alt="Naga Films"
              width={40}
              height={40}
              className="mt-0.5 h-10 w-10 object-contain"
            />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#00ff88]/70">
                Beta
              </p>
              <h1 className="text-3xl font-black tracking-tight">Motion & VFX</h1>
              <p className="mt-2 text-sm text-white/45">
                Open a project to edit Motion & VFX in the browser — or download a package for
                desktop, then import the render and add it to your Film Timeline.
              </p>
            </div>
          </div>
          <Link href="/" className="shrink-0 text-xs text-white/40 hover:text-[#00ff88]">
            ← Studio
          </Link>
        </div>

        <EffectCraftWebLoader className="mb-8" variant="compact" />

        {!enabled && (
          <p className="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50">
            Motion & VFX is off. Set MOTION_ENABLED=true and NEXT_PUBLIC_MOTION_ENABLED=true,
            then redeploy.
          </p>
        )}

        {enabled && !session?.user?.id && (
          <p className="text-sm text-white/50">
            <Link href="/login?callbackUrl=/motion" className="text-[#00ff88]">
              Log in
            </Link>{' '}
            to see your Motion projects.
          </p>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {enabled && session?.user?.id && !error && projects.length === 0 && (
          <p className="rounded-md border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/40">
            No Motion projects yet. In Image or Video Studio, select clips and click Open
            Motion & VFX — or open one from a Film Editor project.
          </p>
        )}

        {projects.length > 0 && (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/motion/${p.id}`}
                  className="block rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-4 hover:border-[#00ff88]/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-[11px] uppercase tracking-wider text-white/35">
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/35">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
