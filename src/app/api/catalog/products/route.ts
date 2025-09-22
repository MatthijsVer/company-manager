import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createProduct, listProducts } from "@/lib/catalog/service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const q = req.nextUrl.searchParams.get("q") || undefined;
    const activeStr = req.nextUrl.searchParams.get("active");
    const active = activeStr == null ? undefined : activeStr === "true";
    const items = await listProducts(session, { q, active });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const created = await createProduct(session, body, session.userId);
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create product" }, { status: 400 });
  }
}
