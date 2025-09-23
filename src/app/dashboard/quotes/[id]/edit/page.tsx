import QuoteEditor from "@/components/quotes/QuoteEditor";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";

async function getQuote(id: string, organizationId: string) {
  const quote = await prisma.quote.findFirst({
    where: { 
      id, 
      organizationId 
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

export default async function QuoteEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();
  const quote = await getQuote(params.id, session.organizationId!);
  
  if (!quote) {
    notFound();
  }

  // Only allow editing of draft quotes
  if (quote.status !== 'DRAFT') {
    redirect(`/dashboard/quotes/${quote.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Edit {quote.number}</h1>
              <p className="text-muted-foreground">
                Make changes to your draft quote
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <QuoteEditor initialQuote={quote} />
    </div>
  );
}