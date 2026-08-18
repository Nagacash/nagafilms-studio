import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { resolveRole } from '@/lib/admin';
import { clientKey, rateLimit, tooMany } from '@/lib/rate-limit';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(req) {
  try {
    const limited = rateLimit(`signup:${clientKey(req)}`, { limit: 8, windowMs: 15 * 60 * 1000 });
    if (!limited.ok) return tooMany(limited.retryAfter);

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid signup data', details: parsed.error.flatten() }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const db = getDb();
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const role = resolveRole(email, 'user');
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [user] = await db
      .insert(schema.users)
      .values({
        email,
        name: parsed.data.name || email.split('@')[0],
        passwordHash,
        role,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
      });

    await db
      .insert(schema.creditWallets)
      .values({ userId: user.id, balance: 0 })
      .onConflictDoNothing();

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
