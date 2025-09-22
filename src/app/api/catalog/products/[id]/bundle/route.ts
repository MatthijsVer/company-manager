import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { setBundleItems } from "@/lib/catalog/service";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAuth();
  const items = await prisma.bundleItem.findMany({
    where: { bundleProductId: params.id, bundle: { organizationId: session.organizationId! } },
    include: { child: true },
  });
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const items = await setBundleItems(session, params.id, Array.isArray(body) ? body : []);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to set bundle items" }, { status: 400 });
  }
}
