import { NextResponse } from "next/server";
import { EXTERNAL_API_BASE } from "@/common/config/api";

const API_SECURITY_KEY = process.env.API_SECURITY_KEY || "X2DPR-RO1WTR-98007-PRS70-VEQ12Y";
const DEFAULT_ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

function corsHeaders(origin?: string) {
  const allowOrigin = origin || DEFAULT_ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,security-key,authorization",
    "Access-Control-Expose-Headers": "Content-Type",
  } as Record<string, string>;
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// GET - List all circuits for authenticated user
export async function GET(request: Request) {
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    const upstreamUrl = `${EXTERNAL_API_BASE}/circuit/getCircuits`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "security-key": API_SECURITY_KEY,
        "authorization": request.headers.get("authorization") || "",
      },
    });

    const text = await upstreamRes.text().catch(() => "");
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
    console.error('[circuits] error fetching circuits', err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch circuits" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// POST - Create new circuit
export async function POST(request: Request) {
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    const body = await request.json().catch(() => null);

    const upstreamUrl = `${EXTERNAL_API_BASE}/circuit/createCircuit`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "security-key": API_SECURITY_KEY,
        "authorization": request.headers.get("authorization") || "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await upstreamRes.text().catch(() => "");
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
    console.error('[circuits] error creating circuit', err);
    return NextResponse.json(
      { success: false, message: "Failed to create circuit" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
