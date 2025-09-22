import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

function nextNumber(seed: number) {
  // very basic; replace with org-scoped sequence table later
  return `Q-${new Date().getFullYear()}-${String(seed).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const currency = body.currency || "EUR";

    // naive sequence using count (OK for now)
    const count = await prisma.quote.count({ where: { organizationId: session.organizationId! }});
    const number = nextNumber(count + 1);

    const quote = await prisma.quote.create({
      data: {
        organizationId: session.organizationId!,
        number,
        currency,
        priceBookId: body.priceBookId || null,
        companyId: body.companyId || null,
        contactId: body.contactId || null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        createdBy: session.userId,
      },
    });

    return NextResponse.json(quote);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to create quote" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const q = await prisma.quote.findFirst({
        where: { id, organizationId: session.organizationId! },
        include: { lines: { orderBy: { position: "asc" } } },
      });
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(q);
    }

    // list
    const list = await prisma.quote.findMany({
      where: { organizationId: session.organizationId! },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
    return NextResponse.json(list);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to fetch quotes" }, { status: 500 });
  }
}
