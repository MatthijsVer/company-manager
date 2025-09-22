import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { updatePriceBook } from "@/lib/catalog/service";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  const pb = await prisma.priceBook.findFirst({
    where: { id: params.id, organizationId: session.organizationId! },
    include: { entries: true },
  });
  if (!pb) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pb);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const pb = await updatePriceBook(session, params.id, body, session.userId);
    return NextResponse.json(pb);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update price book" }, { status: 400 });
  }
}
