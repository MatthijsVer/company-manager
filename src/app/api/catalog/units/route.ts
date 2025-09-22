import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createUnit, listUnits } from "@/lib/catalog/service";

export async function GET() {
  const session = await requireAuth();
  const items = await listUnits(session);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const unit = await createUnit(session, body);
    return NextResponse.json(unit);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create unit" }, { status: 400 });
  }
}
