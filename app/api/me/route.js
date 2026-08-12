import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBalance } from '@/lib/credits';
import { resolveRole } from '@/lib/admin';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ user: null, wallet: null }, { status: 401 });
    }

    const balance = await getBalance(session.user.id);
    const role = resolveRole(session.user.email, session.user.role);
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role,
      },
      wallet: { balance },
    });
  } catch (err) {
    console.error('[me]', err);
    const message = err?.message || 'Failed';
    const dbUnavailable =
      message.includes('DATABASE_URL') || message.includes('connect');
    if (dbUnavailable) {
      return NextResponse.json(
        {
          error: 'Wallet temporarily unavailable',
          wallet: { balance: null, unavailable: true },
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
