import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";

async function getInitialData(organizationId: string, quoteId?: string) {
  const [companies, priceBooks, quote] = await Promise.all([
    prisma.company.findMany({
      where: { 
        organizationId,
        status: "ACTIVE"
      },
      include: {
        contacts: {
          where: { isPrimary: true },
          take: 1
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.priceBook.findMany({
      where: { 
        organizationId,
        isActive: true 
      },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" }
      ]
    }),
    quoteId ? prisma.quote.findFirst({
      where: {
        id: quoteId,
        organizationId,
      },
      include: {
        lines: { orderBy: { position: "asc" } }
      }
    }) : Promise.resolve(null)
  ]);

  return { companies, priceBooks, quote };
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { quoteId?: string };
}) {
  const session = await requireAuth();
  const { companies, priceBooks, quote } = await getInitialData(session.organizationId!, searchParams.quoteId);

  // Create a minimal invoice object for the editor
  const newInvoice = {
    id: 'new',
    organizationId: session.organizationId!,
    number: 'INV-DRAFT',
    status: 'DRAFT',
    currency: quote?.currency || 'EUR',
    subtotal: quote?.subtotal || 0,
    taxTotal: quote?.taxTotal || 0,
    total: quote?.total || 0,
    amountPaid: 0,
    amountDue: quote?.total || 0,
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    paymentTerms: 'Net 30',
    lines: quote?.lines?.map((line: any, index: number) => ({
      productId: line.productId,
      variantId: line.variantId,
      sku: line.sku,
      name: line.name,
      description: line.description,
      unitId: line.unitId,
      unitLabel: line.unitLabel,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      discountPct: line.discountPct ? Number(line.discountPct) : undefined,
      taxRatePct: line.taxRatePct ? Number(line.taxRatePct) : undefined,
      taxAmount: Number(line.taxAmount || 0),
      lineSubtotal: Number(line.lineSubtotal || 0),
      lineTotal: Number(line.lineTotal || 0),
      position: index,
    })) || [],
    payments: [],
    quoteId: quote?.id || null,
    companyId: quote?.companyId || null,
    contactId: quote?.contactId || null,
    notesCustomer: quote?.notesCustomer || null,
    notesInternal: quote?.notesInternal || null,
    billingAddress: null,
    paidDate: null,
    createdBy: session.userId!,
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {quote ? `New Invoice from Quote ${quote.number}` : "New Invoice"}
              </h1>
              <p className="text-muted-foreground">
                {quote ? "Create an invoice based on the accepted quote" : "Create a new invoice for your customer"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <InvoiceEditor 
        initialInvoice={newInvoice}
        companies={companies}
        priceBooks={priceBooks}
        isNew={true}
      />
    </div>
  );
}