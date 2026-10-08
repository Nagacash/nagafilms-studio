import { NextResponse } from 'next/server';
import { isFilmCraftEnabled } from './config';

export function filmCraftDisabledResponse() {
  return NextResponse.json(
    {
      error: 'FilmCraft handoff is disabled',
      hint: 'Set FILMCRAFT_ENABLED=true (and NEXT_PUBLIC_FILMCRAFT_ENABLED=true for UI)',
    },
    { status: 503 }
  );
}

export function assertFilmCraftEnabled() {
  if (!isFilmCraftEnabled()) {
    return filmCraftDisabledResponse();
  }
  return null;
}
