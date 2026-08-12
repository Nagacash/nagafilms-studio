import Link from 'next/link';

/**
 * Shared chrome for legal pages — matches SaaS dark surfaces (login/credits).
 */
export default function LegalShell({ title, children }) {
  return (
    <main className="min-h-screen bg-[var(--bg-app,#050505)] text-white px-4 py-10 sm:px-6 sm:py-14">
      <article className="mx-auto w-full max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--color-primary,#00ff88)]/80">
          Legal
        </p>
        <h1 className="text-balance text-3xl font-black tracking-tight">{title}</h1>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/70 [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white/90 [&_strong]:text-white/85 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-[var(--color-primary,#00ff88)] [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-sm">
          <Link href="/" className="text-white/40 transition-colors hover:text-[var(--color-primary,#00ff88)]">
            ← zurück zur Startseite
          </Link>
        </p>
      </article>
    </main>
  );
}
