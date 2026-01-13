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

// GET - Get circuit by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    const upstreamUrl = `${EXTERNAL_API_BASE}/circuit/getCircuitById/${id}`;

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
    console.error('[circuits] error fetching circuit', err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch circuit" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// PUT - Update circuit
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    const body = await request.json().catch(() => null);

    const upstreamUrl = `${EXTERNAL_API_BASE}/circuit/updateCircuit/${id}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "PUT",
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
    console.error('[circuits] error updating circuit', err);
    return NextResponse.json(
      { success: false, message: "Failed to update circuit" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

// DELETE - Delete circuit
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const origin = request.headers.get("origin") || DEFAULT_ALLOWED_ORIGIN;
  try {
    const upstreamUrl = `${EXTERNAL_API_BASE}/circuit/deleteCircuit/${id}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "DELETE",
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
    console.error('[circuits] error deleting circuit', err);
    return NextResponse.json(
      { success: false, message: "Failed to delete circuit" },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
