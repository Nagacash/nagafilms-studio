import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const MUAPI_BASE = 'https://api.muapi.ai';

async function getApiKey(request) {
  try {
    const session = await auth();
    if (session?.user?.id && process.env.MUAPI_API_KEY) {
      return process.env.MUAPI_API_KEY;
    }
  } catch {
    // fall through to BYO
  }

  const headerKey = request.headers.get('x-api-key');
  if (headerKey && headerKey !== 'session') return headerKey;
  const cookieKey = request.cookies.get('muapi_key')?.value;
  if (cookieKey) return cookieKey;
  return null;
}

function cleanHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie');
  return headers;
}

// Proxies /api/api/v1/* -> https://api.muapi.ai/api/v1/*
// This is required because the AiAgent library hardcodes a double /api/api
async function proxy(request, { params }, method) {
  const apiKey = await getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized — log in or provide an API key' },
      { status: 401 }
    );
  }

  const slug = await params;
  const pathSegments = slug.path || [];
  const path = pathSegments.join('/');
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}/api/v1/${path}${search}`;

  const headers = cleanHeaders(request);
  headers.set('x-api-key', apiKey);

  try {
    const init = { headers, method };
    if (method !== 'GET' && method !== 'HEAD') {
      init.body = await request.arrayBuffer();
    }
    const response = await fetch(targetUrl, init);
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json(
        { error: 'Upstream returned non-JSON', status: response.status },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }
    return NextResponse.json(data ?? {}, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function GET(request, ctx) {
  return proxy(request, ctx, 'GET');
}

export async function POST(request, ctx) {
  return proxy(request, ctx, 'POST');
}
