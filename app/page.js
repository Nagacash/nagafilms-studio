import Link from 'next/link';
import LandingFaq from '@/components/LandingFaq';
import LandingShowreel from '@/components/LandingShowreel';

export const metadata = {
  title: 'Naga Films Studio — Generative Production Stack',
  description:
    'AI image, video, cinema and lip sync across 200+ models. Buy credit packs, generate in the studio — no subscription, no API key required.',
};

const STUDIOS = [
  {
    name: 'Image Studio',
    href: '/studio/image',
    desc: 'Still images from text, or edit a photo you already have.',
    howTo: 'Open → pick a model → write a prompt → Generate',
  },
  {
    name: 'Video Studio',
    href: '/studio/video',
    desc: 'Short clips from text, or turn a still into motion.',
    howTo: 'Open → pick a model → prompt (optional start frame) → Generate',
  },
  {
    name: 'Cinema Studio',
    href: '/studio/cinema',
    desc: 'Shot-level camera and lens control for stills that cut together.',
    howTo: 'Open → set camera/lens → write the shot → Generate',
  },
  {
    name: 'Lip Sync',
    href: '/studio/lipsync',
    desc: 'Make a portrait or video talk to your audio track.',
    howTo: 'Open → upload face + audio → pick a model → Generate',
  },
  {
    name: 'Storyboard',
    href: '/studio/storyboard',
    desc: 'Multi-episode boards: create a project, then library → shots → PDF.',
    howTo: 'Open → create project → Generate library → Generate shots',
  },
  {
    name: 'Marketing Studio',
    href: '/studio/marketing',
    desc: 'Product and brand ads with reference images for consistency.',
    howTo: 'Open → add refs → describe the ad → Generate',
  },
];

const PACKS = [
  { name: 'Starter', price: 9, credits: 500, blurb: 'Try the studios' },
  { name: 'Creator', price: 15, credits: 1000, blurb: 'Regular production work' },
  { name: 'Pro', price: 59, credits: 5000, blurb: 'Volume / shoot days' },
];

const ONBOARDING = [
  { step: '01', title: 'Create account', desc: 'Sign up with email — free, no API key, no subscription.' },
  { step: '02', title: 'Buy credits', desc: 'One-time Stripe checkout. Credits land in your wallet instantly.' },
  { step: '03', title: 'Open Studio', desc: 'Pick a model, see the credit cost, generate. Failed jobs restore credits.' },
];

const STATS = [
  { figure: '200+', label: 'Live models' },
  { figure: '6', label: 'Studios' },
  { figure: '0', label: 'Subscriptions' },
  { figure: '100%', label: 'Pay per use' },
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
            href="#faq"
            title="Common questions: credits, refunds, how generation works"
            className="hidden text-[13px] font-semibold text-white/70 hover:text-[#00ff88] sm:inline"
          >
            FAQ
          </Link>
          <Link
            href="/credits"
            title="Buy a one-time credit pack — no subscription"
            className="hidden text-[13px] font-semibold text-white/70 hover:text-[#00ff88] sm:inline"
          >
            Buy credits
          </Link>
          <Link
            href="/login"
            title="Sign in to use your Naga credit wallet in the studio"
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

          <div className="mt-10 flex flex-wrap items-start gap-4 animate-fade-in-up [animation-delay:240ms]">
            <div>
              <Link
                href="/signup"
                title="Create a free account — then buy credits and open the studio"
                className="group inline-flex items-center gap-2 rounded-md bg-[#00ff88] px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-[#00ff88]/15 transition-all hover:bg-[#33ffa3] hover:shadow-[#00ff88]/30"
              >
                Get started
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <p className="mt-2 max-w-[14rem] text-[11px] leading-snug text-white/40">
                New here? Make an account first — takes about a minute.
              </p>
            </div>
            <div>
              <Link
                href="/credits"
                title="Buy Starter, Creator, or Pro credit packs with Stripe"
                className="inline-flex rounded-md border border-white/20 bg-black/30 px-7 py-3.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-colors hover:border-[#00ff88]/40 hover:text-[#00ff88]"
              >
                Buy credit packs
              </Link>
              <p className="mt-2 max-w-[14rem] text-[11px] leading-snug text-white/40">
                Already signed up? Load credits, then open Studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how-it-works" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">Onboarding</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Up and running in three steps</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/45">
            No MuAPI account, no API key, no monthly bill. Create an account, load credits, start generating.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {ONBOARDING.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-white/[0.07] bg-[#080808] p-8"
              >
                <span className="text-[11px] font-black tracking-widest text-[#00ff88]/60">{item.step}</span>
                <h3 className="mt-3 text-[15px] font-bold">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/40">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <div>
              <Link
                href="/signup"
                title="Create your free Naga Films account"
                className="inline-flex rounded-md bg-[#00ff88] px-6 py-3 text-sm font-bold text-black hover:bg-[#33ffa3]"
              >
                Create account
              </Link>
              <p className="mt-2 text-[11px] text-white/40">Step 1 — email signup, free</p>
            </div>
            <div>
              <Link
                href="/studio/image"
                title="Open Image Studio (sign in required)"
                className="inline-flex rounded-md border border-white/15 px-6 py-3 text-sm font-semibold text-white/70 hover:border-[#00ff88]/40 hover:text-[#00ff88]"
              >
                Open Studio →
              </Link>
              <p className="mt-2 text-[11px] text-white/40">Step 3 — after you have credits</p>
            </div>
          </div>
        </div>
      </section>

      {/* packs */}
      <section id="packs" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Credit packs — no subscription</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/45">
            One-time Stripe checkout. Credits never expire on your account. Each model shows its approximate
            cost in the picker before you generate. Video and some models use dynamic pricing (shown as
            “from ~X credits”).
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PACKS.map((p) => (
              <Link
                key={p.name}
                href="/credits"
                title={`Buy the ${p.name} pack — $${p.price} for ${p.credits.toLocaleString()} credits`}
                className="block rounded-xl border border-white/[0.07] bg-[#080808] p-8 transition-colors hover:border-[#00ff88]/20"
              >
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-2 text-3xl font-black text-[#00ff88]">${p.price}</p>
                <p className="text-xs uppercase tracking-wider text-white/35">
                  {p.credits.toLocaleString()} credits
                </p>
                <p className="mt-3 text-[13px] text-white/40">{p.blurb}</p>
                <p className="mt-4 text-[12px] font-semibold text-[#00ff88]/80">
                  Choose this pack →
                </p>
              </Link>
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-white/35">
            Failed generations restore credits to your wallet — you are not charged for jobs that do not
            complete. Pack purchases are non-refundable once paid; unused credits stay in your account until
            you use them.
          </p>

          <Link
            href="/credits"
            className="mt-8 inline-flex rounded-md bg-[#00ff88] px-6 py-3 text-sm font-bold text-black hover:bg-[#33ffa3]"
          >
            Buy credits →
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

      {/* showreel — same hero portrait, animated for lower sections */}
      <section className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2 md:gap-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">
              In motion
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Same character. Studio lighting. One click to video.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/45">
              Turn a still into motion inside Video Studio — or start from text. This loop was generated
              from the hero portrait you see at the top of the page.
            </p>
            <Link
              href="/studio/video"
              className="mt-8 inline-flex rounded-none border border-[#00ff88]/30 bg-[#00ff88]/10 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-[#00ff88] transition-colors hover:bg-[#00ff88]/20"
            >
              Open Video Studio →
            </Link>
          </div>
          <div className="overflow-hidden border border-white/10 bg-[#080808]">
            <LandingShowreel className="aspect-square w-full object-cover object-top" />
          </div>
        </div>
      </section>

      {/* capabilities */}
      <section id="capabilities" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Six studios, one wallet</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/45">
            Pick a studio below — each card tells you what it does and the exact steps to run.
          </p>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.05] md:grid-cols-2 lg:grid-cols-3">
            {STUDIOS.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                title={`${s.name}: ${s.howTo}`}
                className="group block bg-[#080808] p-8 transition-colors hover:bg-[#0c0c0c]"
              >
                <div className="mb-4 h-[2px] w-8 rounded-full bg-[#00ff88]/50 transition-all group-hover:w-14 group-hover:bg-[#00ff88]" />
                <h3 className="text-[15px] font-bold tracking-tight">{s.name}</h3>
                <p className="mt-2.5 text-[13px] leading-relaxed text-white/40">{s.desc}</p>
                <p className="mt-3 text-[11px] font-medium leading-relaxed text-white/30">
                  {s.howTo}
                </p>
                <p className="mt-4 text-[12px] font-semibold text-[#00ff88]/80 group-hover:text-[#00ff88]">
                  Open {s.name.replace(' Studio', '')} →
                </p>
              </Link>
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
              ['Credit packs', 'One-time Stripe packs — no subscription. See cost per model before you generate.'],
              ['Failed job protection', 'Credits restore automatically when a generation fails.'],
              ['Live model catalog', '200+ models synced from the provider — with credit estimates in the picker.'],
              ['Open source', 'MIT licensed codebase — self-hostable for teams that need full control.'],
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

      {/* faq */}
      <section id="faq" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00ff88]/70">FAQ</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Common questions</h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/45">
            Onboarding, pricing, credits, refunds, and what you need to get started.
          </p>
          <div className="mt-12">
            <LandingFaq />
          </div>
        </div>
      </section>

      {/* cta — animated loop from hero portrait; hero section above stays the still image */}
      <section className="relative z-10 min-h-[28rem] overflow-hidden border-t border-white/[0.06] py-28">
        <div className="pointer-events-none absolute inset-0">
          <LandingShowreel className="h-full w-full scale-110 object-cover object-top blur-md" />
          <div className="absolute inset-0 bg-[#050505]/70" />
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
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-[12px] text-white/30">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row md:items-start">
            <div className="space-y-1 text-center md:text-left">
              <p>© {new Date().getFullYear()} Naga Films · Hamburg</p>
              <p>
                Official brand:{' '}
                <a
                  href="https://nagaclub.de"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 transition-colors hover:text-[#00ff88]"
                >
                  Naga Apparel
                </a>{' '}
                —{' '}
                <a
                  href="https://nagaclub.de"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 transition-colors hover:text-[#00ff88]"
                >
                  https://nagaclub.de
                </a>
              </p>
              <p>
                Designed by{' '}
                <a
                  href="https://nagacodex.cloud"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 transition-colors hover:text-[#00ff88]"
                >
                  Naga Codex
                </a>
                :{' '}
                <a
                  href="https://nagacodex.cloud"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/50 transition-colors hover:text-[#00ff88]"
                >
                  https://nagacodex.cloud
                </a>
              </p>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link href="/policy" className="text-white/50 transition-colors hover:text-[#00ff88]">
                Privacy
              </Link>
              <Link href="/impressum" className="text-white/50 transition-colors hover:text-[#00ff88]">
                Impressum
              </Link>
              <Link href="/policy#eu-ai-act" className="text-white/50 transition-colors hover:text-[#00ff88]">
                AI Act notice
              </Link>
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
            </nav>
          </div>
          <p className="text-center text-[11px] leading-relaxed text-white/25 md:text-left">
            Studio outputs are AI-generated or AI-manipulated. Disclose deepfakes when you publish where
            required by law.
          </p>
        </div>
      </footer>
    </main>
  );
}
