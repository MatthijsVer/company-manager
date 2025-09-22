import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { quoteUnitPrice } from "@/lib/catalog/pricing";
import { Decimal } from "@prisma/client/runtime/library";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { id } = params;
    const body = await req.json();

    // body: { currency?, priceBookId?, companyId?, notesInternal?, notesCustomer?, lines: [...] }
    const existing = await prisma.quote.findFirst({
      where: { id, organizationId: session.organizationId! },
    });
    if (!existing) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    // compute lines using pricing engine
    const computed: any[] = [];
    for (const [idx, l] of (body.lines || []).entries()) {
      // call pricing engine per line
      const res = await quoteUnitPrice({
        organizationId: session.organizationId!,
        productId: l.productId,
        variantId: l.variantId,
        priceBookId: body.priceBookId || existing.priceBookId || undefined,
        unitId: l.unitId,
        quantity: Number(l.quantity || 1),
        shipTo: body.shipTo,
      });
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

      computed.push({
        id: l.id || undefined,
        productId: l.productId || null,
        variantId: l.variantId || null,
        sku: l.sku || null,
        name: l.name || l.displayName || l.productName || "Item",
        description: l.description || null,
        unitId: res.unitId || null,
        unitLabel: l.unitLabel || null,
        quantity: new Decimal(res.quantity),
        unitPrice: new Decimal(res.unitPrice),          // net excl tax
        discountPct: l.discountPct ? new Decimal(l.discountPct) : (res.discountPct ? new Decimal(res.discountPct) : null),
        taxClassId: res.tax.classId || null,
        taxRatePct: new Decimal(res.tax.effectiveRatePct),
        taxAmount: new Decimal(res.tax.taxAmount),
        lineSubtotal: new Decimal(res.lineSubtotal),
        lineTotal: new Decimal(res.lineTotal),
        position: typeof l.position === "number" ? l.position : idx,
      });
    }

    // rollup totals
    const subtotal = computed.reduce((s, x) => s.add(x.lineSubtotal), new Decimal(0));
    const taxTotal = computed.reduce((s, x) => s.add(x.taxAmount), new Decimal(0));
    const total    = computed.reduce((s, x) => s.add(x.lineTotal), new Decimal(0));

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.quote.update({
        where: { id },
        data: {
          currency: body.currency || existing.currency,
          priceBookId: body.priceBookId ?? existing.priceBookId,
          companyId: body.companyId ?? existing.companyId,
          contactId: body.contactId ?? existing.contactId,
          notesInternal: body.notesInternal ?? existing.notesInternal,
          notesCustomer: body.notesCustomer ?? existing.notesCustomer,
          validUntil: body.validUntil ? new Date(body.validUntil) : existing.validUntil,
          subtotal, taxTotal, total,
          updatedBy: session.userId,
        },
      });

      // replace lines (simple approach; you can diff for true upserts later)
      await tx.quoteLine.deleteMany({ where: { quoteId: id }});
      await tx.quoteLine.createMany({
        data: computed.map(c => ({ ...c, quoteId: id })),
      });

      return up;
    });

    const final = await prisma.quote.findUnique({
      where: { id: updated.id },
      include: { lines: { orderBy: { position: "asc" } } },
    });

    return NextResponse.json(final);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Failed to save quote" }, { status: 500 });
  }
}
