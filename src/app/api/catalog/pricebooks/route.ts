import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createPriceBook, listPriceBooks } from "@/lib/catalog/service";

export async function GET() {
  const session = await requireAuth();
  const items = await listPriceBooks(session);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const pb = await createPriceBook(session, body, session.userId);
    return NextResponse.json(pb);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create price book" }, { status: 400 });
  }
}
