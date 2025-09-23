import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InvoiceViewer } from "@/components/invoices/InvoiceViewer";
import { notFound } from "next/navigation";

async function getInvoice(id: string, organizationId: string) {
  const invoice = await prisma.invoice.findFirst({
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

  if (!invoice) return null;

  // Convert Decimal fields to strings for JSON serialization
  return {
    ...invoice,
    subtotal: invoice.subtotal.toString(),
    taxTotal: invoice.taxTotal.toString(),
    total: invoice.total.toString(),
    amountPaid: invoice.amountPaid.toString(),
    amountDue: invoice.amountDue.toString(),
    lines: invoice.lines.map(line => ({
      ...line,
      quantity: line.quantity.toString(),
      unitPrice: line.unitPrice.toString(),
      discountPct: line.discountPct?.toString() || null,
      taxRatePct: line.taxRatePct?.toString() || null,
      taxAmount: line.taxAmount.toString(),
      lineSubtotal: line.lineSubtotal.toString(),
      lineTotal: line.lineTotal.toString(),
    })),
    payments: invoice.payments.map(payment => ({
      ...payment,
      amount: payment.amount.toString(),
    })),
  };
}


export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();
  const invoice = await getInvoice(params.id, session.organizationId!);

  if (!invoice) {
    notFound();
  }

  return <InvoiceViewer invoice={invoice} />;
}