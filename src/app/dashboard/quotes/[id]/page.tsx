// app/dashboard/quotes/[id]/page.tsx
import QuoteEditor from "@/components/quotes/QuoteEditor";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

async function getQuote(id: string) {
  const session = await getSession();
  if (!session?.organizationId) return null;
  
  const quote = await prisma.quote.findFirst({
    where: { 
      id, 
      organizationId: session.organizationId 
    },
    include: { 
      lines: { 
        orderBy: { position: "asc" } 
      } 
    },
  });
  
  if (!quote) return null;
  
  // Convert Decimal fields to strings for JSON serialization
  return {
    ...quote,
    subtotal: quote.subtotal.toString(),
    taxTotal: quote.taxTotal.toString(),
    total: quote.total.toString(),
    lines: quote.lines.map(line => ({
      ...line,
      quantity: line.quantity.toString(),
      unitPrice: line.unitPrice.toString(),
      discountPct: line.discountPct?.toString() || null,
      taxRatePct: line.taxRatePct?.toString() || null,
      taxAmount: line.taxAmount.toString(),
      lineSubtotal: line.lineSubtotal.toString(),
      lineTotal: line.lineTotal.toString(),
    })),
  };
}

export default async function QuoteDetail({
  params,
}: {
  params: { id: string };
}) {
  const quote = await getQuote(params.id);
  if (!quote) return <div className="p-6">Quote not found</div>;
  return <QuoteEditor initialQuote={quote} />;
}
