import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InvoiceEditor } from "@/components/invoices/InvoiceEditor";
import { notFound, redirect } from "next/navigation";

async function getInvoice(id: string, organizationId: string) {
  return prisma.invoice.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      company: true,
      contact: true,
      creator: {
        select: { name: true, email: true }
      },
      updater: {
        select: { name: true, email: true }
      },
      quote: {
        select: { number: true, id: true }
      },
      lines: {
        orderBy: { position: "asc" }
      },
      payments: {
        include: {
          creator: {
            select: { name: true, email: true }
          }
        },
        orderBy: { receivedDate: "desc" }
      }
    },
  });
}

async function getInitialData(organizationId: string) {
  const [companies, priceBooks] = await Promise.all([
    prisma.company.findMany({
      where: { 
        organizationId,
        status: "ACTIVE"
      },
      include: {
        contacts: true
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
    })
  ]);

  return { companies, priceBooks };
}

export default async function InvoiceEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();
  const [invoice, { companies, priceBooks }] = await Promise.all([
    getInvoice(params.id, session.organizationId!),
    getInitialData(session.organizationId!)
  ]);

  if (!invoice) {
    notFound();
  }

  // Only allow editing of draft invoices
  if (invoice.status !== 'DRAFT') {
    redirect(`/dashboard/invoices/${invoice.id}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Edit {invoice.number}</h1>
              <p className="text-muted-foreground">
                Make changes to your draft invoice
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <InvoiceEditor 
        initialInvoice={invoice}
        companies={companies}
        priceBooks={priceBooks}
        isNew={false}
      />
    </div>
  );
}