import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { assertUploadTargetUrl, SSRF_FETCH } from '@/lib/ssrf';
import { clientKey, rateLimit, tooMany } from '@/lib/rate-limit';

export async function POST(request) {
  const limited = rateLimit(`upload:${clientKey(request)}`, { limit: 30, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) return tooMany(limited.retryAfter);

  const session = await auth().catch(() => null);
  const headerKey = request.headers.get('x-api-key');
  const cookieKey = request.cookies.get('muapi_key')?.value;
  const authed = Boolean(session?.user?.id || (headerKey && headerKey !== 'session') || cookieKey);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const targetUrl = formData.get('x-proxy-target-url');
    const allowed = assertUploadTargetUrl(targetUrl);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 400 });
    }

    const s3FormData = new FormData();
    for (const [key, value] of formData.entries()) {
      if (key !== 'x-proxy-target-url') {
        s3FormData.append(key, value);
      }
    }

    const s3Response = await fetch(allowed.url, {
      method: 'POST',
      body: s3FormData,
      ...SSRF_FETCH,
    });

    if (s3Response.ok || s3Response.status === 204) {
      return new Response(null, { status: 204 });
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: s3Response.status });
  } catch (error) {
    console.error('Upload Proxy Exception:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
