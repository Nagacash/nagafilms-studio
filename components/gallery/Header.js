'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BrandMark from '@/components/gallery/BrandMark';
import LogoutButton from '@/components/LogoutButton';

const NAV = [
  { label: 'Filter', href: '/film/filter' },
  { label: 'Visual Search', href: '/film/visual-search' },
  { label: 'Discover', href: '/film/discover' },
  { label: 'News', href: '/film/news' },
  { label: 'Labs', href: '/film/labs' },
  { label: 'Pricing', href: '/film/pricing' },
  { label: 'Contact', href: '/film/contact' },
];

const MOBILE_NAV = [
  { label: 'Filter', href: '/film/filter' },
  { label: 'Discover', href: '/film/discover' },
  { label: 'Movies', href: '/film/movie' },
  { label: 'Studio', href: '/studio' },
];

export default function GalleryHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const loginHref = `/login?callbackUrl=${encodeURIComponent(pathname || '/film')}`;
  const accountLabel = session?.user?.email?.split('@')[0] || 'Account';

  return (
    <header className="nf-header">
      <div className="nf-header-inner">
        <BrandMark href="/film" />

        <nav className="nf-nav" aria-label="Gallery">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={pathname === n.href || pathname.startsWith(`${n.href}/`) ? 'is-active' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="nf-header-right">
          <Link href="/" className="nf-header-bridge" title="Naga Films Studio landing">
            Studio
          </Link>
          <Link href="/credits" className="nf-header-bridge nf-header-bridge-hide-sm" title="Buy credit packs">
            Credits
          </Link>
          <form className="nf-search" action="/film/filter" method="get" role="search">
            <SearchIcon />
            <input
              type="search"
              name="search"
              placeholder="Search frames, movies, people..."
              aria-label="Search frames, movies, people"
            />
          </form>
          <Link href="/film/contact" className="nf-btn nf-btn-outline nf-btn-hide-sm">+ Request</Link>
          {status === 'authenticated' ? (
            <>
              <Link
                href="/studio"
                className="nf-header-account"
                title={session.user?.email || 'Naga Films Studio'}
              >
                {accountLabel}
              </Link>
              <LogoutButton
                className="nf-btn nf-btn-login"
                label="Log out"
                redirectTo={pathname || '/film'}
              />
            </>
          ) : status === 'loading' ? (
            <span className="nf-btn nf-btn-login nf-btn-login-slot" aria-hidden="true">
              Log in
            </span>
          ) : (
            <Link href={loginHref} className="nf-btn nf-btn-login" title="Sign in to Naga Films Studio">
              Log in
            </Link>
          )}
        </div>
      </div>

      <nav className="nf-nav-mobile" aria-label="Gallery quick links">
        {MOBILE_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={pathname === n.href || pathname.startsWith(`${n.href}/`) ? 'is-active' : undefined}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
