import { NextResponse } from 'next/server';
import { isMotionEnabled } from './config';

export function motionDisabledResponse() {
  return NextResponse.json(
    {
      error: 'Motion & VFX handoff is disabled',
      hint: 'Set MOTION_ENABLED=true (and NEXT_PUBLIC_MOTION_ENABLED=true for UI)',
    },
    { status: 503 }
  );
}

export function assertMotionEnabled() {
  if (!isMotionEnabled()) {
    return motionDisabledResponse();
  }
  return null;
}
