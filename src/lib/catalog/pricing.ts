import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import type { OrgRole } from "@prisma/client";

/** PriceBasis controls tax math */
export type PriceBasis = "EXCLUSIVE" | "INCLUSIVE";

export type PriceInput = {
  organizationId: string;
  productId?: string;
  variantId?: string;
  priceBookId?: string;       // optional; pick default active if omitted
  unitId?: string;            // optional override (else product/entry unit)
  quantity: number;           // > 0
  asOf?: Date;                // for validity windows
  shipTo?: { country?: string; region?: string; postal?: string }; // tax match
};

export type PriceResult = {
  ok: true;
  productId: string;
  variantId?: string | null;
  priceBookId: string;
  unitId?: string | null;
  quantity: number;
  basis: PriceBasis;
  currency: string;
  unitPrice: string;          // BEFORE tax, AFTER per-entry discount
  discountPct?: string | null;
  tax: {
    classId?: string | null;
    rules: Array<{ ruleId: string; name: string; ratePct: string; compound: boolean }>;
    taxAmount: string;        // absolute money
    effectiveRatePct: string; // summed/compounded rate
  };
  lineSubtotal: string;       // excl tax
  lineTotal: string;          // incl tax (or just subtotal when EXCLUSIVE)
} | { ok: false; error: string };

// ------- Helpers -------
function dec(n: number | string | Decimal): Decimal {
  return new Decimal(n as any);
}
function inWindow(asOf: Date | undefined, from?: Date | null, to?: Date | null) {
  const t = (asOf ?? new Date()).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t >= to.getTime()) return false;
  return true;
}

async function pickActivePriceBook(orgId: string, explicitId?: string) {
  if (explicitId) {
    const pb = await prisma.priceBook.findFirst({ where: { id: explicitId, organizationId: orgId, isActive: true }});
    if (pb) return pb;
  }
  return prisma.priceBook.findFirst({
    where: { organizationId: orgId, isActive: true, isDefault: true },
    orderBy: { createdAt: "desc" },
  });
}

function bestEntryForQty(entries: any[], qty: Decimal, asOf?: Date) {
  // filter by date window + qty tiers, pick the most specific (highest minQty)
  const candidates = entries.filter((e) => {
    if (!inWindow(asOf, e.validFrom, e.validTo)) return false;
    if (e.minQty && qty.lt(e.minQty)) return false;
    if (e.maxQty && qty.gt(e.maxQty)) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const aMin = dec(a.minQty || 0);
    const bMin = dec(b.minQty || 0);
    // prefer the higher minQty (more specific tier)
    if (!aMin.eq(bMin)) return bMin.minus(aMin).toNumber();
    // If same minQty, prefer by id (deterministic ordering)
    return a.id.localeCompare(b.id);
  });
  return candidates[0];
}

function applyCompoundTax(subtotal: Decimal, rules: Array<{ rate: Decimal; compound: boolean }>) {
  // returns { taxAmount, effectiveRatePct }
  let base = subtotal;
  let taxTotal = dec(0);
  for (const r of rules) {
    const thisTax = base.mul(r.rate).div(100);
    taxTotal = taxTotal.add(thisTax);
    if (r.compound) base = base.add(thisTax); // next rule compounds on tax-inclusive base
  }
  const eff = taxTotal.eq(0) ? dec(0) : taxTotal.mul(100).div(subtotal);
  return { taxAmount: taxTotal, effectiveRatePct: eff };
}

// ------- Main -------
export async function quoteUnitPrice(input: PriceInput): Promise<PriceResult> {
  try {
    const asOf = input.asOf ?? new Date();
    const qty = dec(input.quantity);
    if (qty.lte(0)) return { ok: false, error: "Quantity must be > 0" };

    // 1) Product + base info
    const product = await prisma.product.findFirst({
      where: { organizationId: input.organizationId, id: input.productId },
      include: {
        unit: true,
        taxClass: { include: { rules: true } },
        priceEntries: {
          where: { priceBookId: input.priceBookId ?? undefined },
          include: { unit: true, priceBook: true, variant: true },
        },
        variants: true,
      },
    });
    if (!product) return { ok: false, error: "Product not found" };

    // 2) PriceBook
    const pb = await pickActivePriceBook(input.organizationId, input.priceBookId);
    if (!pb) return { ok: false, error: "No active price book" };
    const basis: PriceBasis = (pb.priceBasis as any) || "EXCLUSIVE";

    // 3) Gather entries for product or variant
    const entries = await prisma.priceBookEntry.findMany({
      where: {
        priceBookId: pb.id,
        OR: [
          { productId: product.id, variantId: null },
          ...(input.variantId ? [{ variantId: input.variantId }] : []),
        ],
      },
      orderBy: [{ minQty: "asc" }],
      include: { unit: true },
    });
    if (!entries.length) return { ok: false, error: "No price found in selected price book" };

    // 4) Resolve best entry for quantity window
    const entry = bestEntryForQty(entries as any, qty, asOf);
    if (!entry) return { ok: false, error: "No valid tier for given quantity/date" };

    // 5) Discounts & unit
    const base = dec(entry.unitPrice);
    const discount = entry.discountPct ? dec(entry.discountPct) : dec(0);
    const netUnit = discount.gt(0) ? base.mul(dec(100).minus(discount)).div(100) : base;
    const unitId = input.unitId ?? entry.unitId ?? product.unitId;

    // 6) Subtotal (excl tax)
    const lineSubtotal = netUnit.mul(qty);

    // 7) Tax match (very simple matcher by country/region/postal)
    const rules = (product.taxClass?.rules || [])
      .filter(r => r.isActive && inWindow(asOf, r.validFrom, r.validTo))
      .filter(r => {
        if (input.shipTo?.country && r.country && r.country !== input.shipTo.country) return false;
        if (input.shipTo?.region && r.region && r.region !== input.shipTo.region) return false;
        if (input.shipTo?.postal && r.postalPattern) {
          try {
            const pat = new RegExp(r.postalPattern.replace("*", ".*"), "i");
            if (!pat.test(input.shipTo.postal)) return false;
          } catch { /* ignore bad pattern */ }
        }
        return true;
      })
      .map(r => ({ id: r.id, name: r.name, rate: dec(r.rate), compound: r.isCompound }));

    // 8) Compute tax depending on basis
    let taxAmount = dec(0);
    let effectiveRate = dec(0);
    let lineTotal = lineSubtotal;

    if (rules.length) {
      const ordered = rules.sort((a, b) => Number(b.compound) - Number(a.compound)); // non-compound first
      if (basis === "EXCLUSIVE") {
        const { taxAmount: t, effectiveRatePct } = applyCompoundTax(lineSubtotal, ordered.map(r => ({ rate: r.rate, compound: r.compound })));
        taxAmount = t;
        effectiveRate = effectiveRatePct;
        lineTotal = lineSubtotal.add(taxAmount);
      } else { // INCLUSIVE: back out tax to keep totals consistent
        // Effective rate on gross: tax = gross - (gross / (1 + eff))
        const { taxAmount: t, effectiveRatePct } = applyCompoundTax(lineSubtotal, ordered.map(r => ({ rate: r.rate, compound: r.compound })));
        // For inclusive, we interpret entry price as tax-included unit; adjust so subtotal is net
        const gross = lineSubtotal;
        const net = gross.div(dec(1).add(effectiveRatePct.div(100)));
        taxAmount = gross.sub(net);
        effectiveRate = effectiveRatePct;
        lineTotal = gross; // already includes tax
        // Overwrite subtotal to be net
        // (Callers may still treat lineSubtotal as net)
      }
    }

    return {
      ok: true,
      productId: product.id,
      variantId: entry.variantId,
      priceBookId: pb.id,
      unitId,
      quantity: qty.toNumber(),
      basis,
      currency: pb.currency,
      unitPrice: netUnit.toFixed(2),
      discountPct: discount.gt(0) ? discount.toFixed(2) : null,
      tax: {
        classId: product.taxClassId,
        rules: rules.map(r => ({ ruleId: r.id, name: r.name, ratePct: r.rate.toFixed(2), compound: r.compound })),
        taxAmount: taxAmount.toFixed(2),
        effectiveRatePct: effectiveRate.toFixed(4),
      },
      lineSubtotal: (basis === "EXCLUSIVE" ? lineSubtotal : lineSubtotal.sub(taxAmount)).toFixed(2),
      lineTotal: lineTotal.toFixed(2),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Pricing error" };
  }
}
