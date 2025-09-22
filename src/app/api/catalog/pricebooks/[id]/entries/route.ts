import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { addPriceBookEntry } from "@/lib/catalog/service";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  const entries = await prisma.priceBookEntry.findMany({
    where: { priceBookId: params.id, priceBook: { organizationId: session.organizationId! } },
    include: { product: true, variant: true, unit: true },
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const entry = await addPriceBookEntry(session, params.id, body);
    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to add entry" }, { status: 400 });
  }
}
