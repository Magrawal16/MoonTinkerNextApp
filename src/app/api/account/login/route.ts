import { NextResponse } from "next/server";
import { EXTERNAL_API_BASE } from "@/common/config/api";

// Proxy route: forward client POSTs to the external API and inject server-side key
// Use environment variables when available so UAT/Prod can be configured without code changes.
const API_SECURITY_KEY = process.env.API_SECURITY_KEY || "X2DPR-RO1WTR-98007-PRS70-VEQ12Y";
const DEFAULT_ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

function corsHeaders(origin?: string) {
  const allowOrigin = origin || DEFAULT_ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    // upstream requires 'security-key' so allow it in preflight
    "Access-Control-Allow-Headers": "Content-Type,security-key,authorization",
    // make sure clients can read these if needed
    "Access-Control-Expose-Headers": "Content-Type",
  } as Record<string, string>;
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    // preserve the incoming JSON body shape (don't mutate keys/casing)
    const body = await request.json().catch(() => null);

    // Logging to help diagnose 400/401 responses from upstream.
    try {
      console.log('[proxy] /api/account/login incoming request at', new Date().toISOString());
      console.log('[proxy] origin:', origin);
      console.log('[proxy] request body:', body);
      const hasClientSec = !!request.headers.get('security-key');
      console.log('[proxy] client provided security-key header present?', hasClientSec);
    } catch (e) {
      // swallow logging errors
    }

    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "security-key": API_SECURITY_KEY,
    };

    const upstreamUrl = `${EXTERNAL_API_BASE}/account/login`;
    console.log('[proxy] forwarding to upstream:', upstreamUrl);
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await upstreamRes.text().catch(() => "");
    console.log('[proxy] upstream response status:', upstreamRes.status);
    console.log('[proxy] upstream response body:', text);

    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (e) {
      // upstream returned non-JSON
    }

    const headers = corsHeaders(origin);
    if (parsed !== null) {
      return NextResponse.json(parsed, { status: upstreamRes.status, headers });
    }
    return new NextResponse(text, { status: upstreamRes.status, headers });
  } catch (err) {
    console.error('[proxy] error forwarding login request', err);
    return NextResponse.json({ success: false, message: "Proxy error" }, { status: 502, headers: corsHeaders(origin) });
  }
}

