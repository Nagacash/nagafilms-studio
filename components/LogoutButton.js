'use client';

import { signOut } from 'next-auth/react';

/**
 * Clears local MuAPI key cookie/storage and ends the NextAuth session.
 */
export async function logoutEverywhere({ redirectTo = '/' } = {}) {
  try {
    localStorage.removeItem('muapi_key');
  } catch {
    // ignore
  }
  document.cookie = 'muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  await signOut({ callbackUrl: redirectTo });
}

export default function LogoutButton({
  className = '',
  label = 'Log out',
  redirectTo = '/',
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void logoutEverywhere({ redirectTo });
      }}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[13px] font-bold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200'
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {label}
    </button>
  );
}
