import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { quoteUnitPrice } from "@/lib/catalog/pricing";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const result = await quoteUnitPrice({
      organizationId: session.organizationId!,
      productId: body.productId,
      variantId: body.variantId,
      priceBookId: body.priceBookId,
      unitId: body.unitId,
      quantity: Number(body.quantity || 1),
      asOf: body.asOf ? new Date(body.asOf) : undefined,
      shipTo: body.shipTo,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to quote" }, { status: 500 });
  }
}
