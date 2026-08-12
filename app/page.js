import Link from 'next/link';

export const metadata = {
  title: 'Naga Films Studio — Generative Production Stack',
  description:
    'A self-hostable generative production stack for image, video, cinema and lip sync. 200+ models, unrestricted, bring your own key. Built by Naga Films, Hamburg.',
};

const STUDIOS = [
  { name: 'Image Studio', desc: 'Text-to-image and image-to-image across 100+ models, up to 14 reference images per request.' },
  { name: 'Video Studio', desc: 'Text-to-video and image-to-video — Kling, Veo, Sora, Runway, Seedance, Hailuo, Wan.' },
  { name: 'Cinema Studio', desc: 'Shot-level control: camera moves, lens language and framing for sequences that cut together.' },
  { name: 'Lip Sync', desc: 'Nine models for portrait and video lip sync — performance from a still or an existing take.' },
];

const STATS = [
  { figure: '200+', label: 'Models' },
  { figure: '9', label: 'Lip sync engines' },
  { figure: '14', label: 'Reference images per call' },
  { figure: '100%', label: 'Self-hostable' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased overflow-x-hidden">
      {/* nav — floats over hero */}
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src="/naga-mark.svg" alt="Naga Films" width={36} height={36} className="h-9 w-9 drop-shadow-[0_0_12px_rgba(0,0,0,0.6)]" />
          <span className="text-sm font-bold tracking-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]">
            NAGA FILMS <span className="font-medium text-white/50">Studio</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/credits"
            className="hidden sm:inline text-[13px] font-semibold text-white/70 hover:text-[#00ff88]"
          >
            Buy credits
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/20 bg-black/40 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md transition-colors hover:border-[#00ff88]/50 hover:bg-black/60 hover:text-[#00ff88]"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* hero — full-bleed image plane */}
      <section className="relative z-10 flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <img
          src="/hero.jpg"
          alt="Naga Films Studio character portrait"
          className="absolute inset-0 h-full w-full object-cover object-[center_20%] animate-hero-ken"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-[#050505]/25 to-transparent" />
        <div className="pointer-events-none absolute -top-20 left-1/3 h-[420px] w-[520px] rounded-full bg-[#00ff88]/[0.08] blur-[120px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-32 md:pb-20 md:pt-40">
          <p className="mb-5 animate-fade-in-up text-[11px] font-semibold uppercase tracking-[0.25em] text-[#00ff88]/80">
            Hamburg · Generative Production Stack
          </p>
          <h1 className="max-w-3xl animate-fade-in-up text-5xl font-black leading-[1.02] tracking-tight [animation-delay:80ms] md:text-7xl">
            NAGA FILMS
            <br />
            <span className="text-white/40">Every model. No gatekeeper.</span>
          </h1>
          <p className="mt-7 max-w-lg animate-fade-in-up text-[15px] leading-relaxed text-white/55 [animation-delay:160ms]">
            Image, video, cinema and lip sync — 200+ models behind one studio. Buy credit packs, generate, pay only for what you use. No subscription.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in-up [animation-delay:240ms]">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-md bg-[#00ff88] px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-[#00ff88]/15 transition-all hover:bg-[#33ffa3] hover:shadow-[#00ff88]/30"
            >
              Get started
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href="/credits"
              className="rounded-md border border-white/20 bg-black/30 px-7 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88]"
            >
              Buy credit packs
            </Link>
          </div>
        </div>
      </section>

      {/* packs teaser — functional CTA; visual polish later */}
      <section id="packs" className="relative z-10 border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Credit packs</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/45">
            One-time Stripe checkout. Credits unlock after payment — Starter 500 · Creator 1,000 · Pro 5,000.
          </p>
          <Link
            href="/credits"
            className="mt-8 inline-flex rounded-md bg-[#00ff88] px-6 py-3 text-sm font-bold text-black hover:bg-[#33ffa3]"
          >
            View packs →
          </Link>
        </div>
      </section>

      {/* stats — below first viewport */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-8">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#080808] px-6 py-7">
              <dt className="text-3xl font-black tracking-tight text-[#00ff88]">{s.figure}</dt>
              <dd className="mt-1 text-[12px] font-medium uppercase tracking-wider text-white/35">{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* capabilities */}
      <section id="capabilities" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Four studios, one key</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/45">
            Built for real production work — concept art, pre-visualisation, motion tests and finished shots.
          </p>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.05] md:grid-cols-2 lg:grid-cols-3">
            {STUDIOS.map((s) => (
              <div key={s.name} className="group bg-[#080808] p-8 transition-colors hover:bg-[#0c0c0c]">
                <div className="mb-4 h-[2px] w-8 rounded-full bg-[#00ff88]/50 transition-all group-hover:w-14 group-hover:bg-[#00ff88]" />
                <h3 className="text-[15px] font-bold tracking-tight">{s.name}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-white/40">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why */}
      <section className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Built for a film pipeline</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/45">
              Naga Films is a Hamburg production company. This studio exists because generative tooling
              inside a real production has requirements hosted platforms don&apos;t meet — period subject matter
              that consumer filters reject, unreleased material that shouldn&apos;t sit in someone else&apos;s account,
              and enough model breadth to pick the right one per shot.
            </p>
          </div>
          <ul className="space-y-6">
            {[
              ['Credit packs', 'One-time Stripe packs — no subscription. Fair markup on generation.'],
              ['Self-hosted option', 'Run it on your own infrastructure when you need full control.'],
              ['Bring your own key', 'Still supported for operators who want direct MuAPI billing.'],
              ['Open source', 'MIT licensed and fully hackable — extend it to fit your pipeline.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-4 border-b border-white/[0.06] pb-6 last:border-0">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#00ff88]" />
                <div>
                  <h3 className="text-[14px] font-bold">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/40">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* cta */}
      <section className="relative z-10 overflow-hidden border-t border-white/[0.06] py-28">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <img src="/hero.jpg" alt="" className="h-full w-full object-cover object-top scale-110 blur-2xl" />
          <div className="absolute inset-0 bg-[#050505]/85" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <img src="/naga-mark.svg" alt="" width={56} height={56} className="mx-auto mb-8 h-14 w-14 opacity-90" />
          <h2 className="mx-auto max-w-xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            Start with the shot you can&apos;t get anywhere else.
          </h2>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-md bg-[#00ff88] px-8 py-4 text-sm font-bold text-black transition-all hover:bg-[#33ffa3]"
          >
            Create account →
          </Link>
          <p className="mt-5 text-[12px] text-white/25">
            Already have an account?{' '}
            <Link href="/login" className="text-white/40 underline-offset-4 transition-colors hover:text-[#00ff88]">
              Log in
            </Link>
            {' · '}
            <Link href="/credits" className="text-white/40 underline-offset-4 transition-colors hover:text-[#00ff88]">
              Buy credits
            </Link>
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-[12px] text-white/30 md:flex-row">
          <span>
            © {new Date().getFullYear()} Naga Films · Hamburg — engineering by{' '}
            <a
              href="https://nagacodex.cloud"
              target="_blank"
              rel="noreferrer"
              className="text-white/50 transition-colors hover:text-[#00ff88]"
            >
              Naga Codex
            </a>
          </span>
          <span>
            Built on{' '}
            <a
              href="https://github.com/Anil-matcha/Open-Generative-AI"
              target="_blank"
              rel="noreferrer"
              className="text-white/50 transition-colors hover:text-[#00ff88]"
            >
              Open Generative AI
            </a>{' '}
            · MIT
          </span>
        </div>
      </footer>
    </main>
  );
}
