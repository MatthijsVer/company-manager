import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { OrgRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { role, userId, rateCardId, asOf } = body as {
      role?: OrgRole; userId?: string; rateCardId?: string; asOf?: string;
    };

    const card = await (async () => {
      if (rateCardId) {
        return prisma.rateCard.findFirst({ where: { id: rateCardId, organizationId: session.organizationId, isActive: true }});
      }
      return prisma.rateCard.findFirst({
        where: { organizationId: session.organizationId, isActive: true, isDefault: true },
        orderBy: { updatedAt: "desc" }
      });
    })();

    if (!card) return NextResponse.json({ error: "No active rate card" }, { status: 404 });

    const when = asOf ? new Date(asOf) : new Date();

    const items = await prisma.rateCardItem.findMany({
      where: { rateCardId: card.id },
      include: { unit: true, user: true },
    });

    // Priority: user match > role match > none
    const match = items
      .filter(i => (!i.validFrom || when >= i.validFrom) && (!i.validTo || when < i.validTo))
      .sort((a, b) => {
        const aScore = a.userId ? 2 : (a.role ? 1 : 0);
        const bScore = b.userId ? 2 : (b.role ? 1 : 0);
        return bScore - aScore;
      })
      .find(i => (userId && i.userId === userId) || (role && i.role === role) || (!i.userId && !i.role));

    if (!match) return NextResponse.json({ error: "No matching rate" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      rateCardId: card.id,
      currency: card.currency,
      unitId: match.unitId,
      unitLabel: match.unit.label,
      unitPrice: new Decimal(match.unitPrice).toFixed(2),
      productId: match.productId || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to resolve rate" }, { status: 500 });
  }
}
