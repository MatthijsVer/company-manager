import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { InvoiceViewer } from "@/components/invoices/InvoiceViewer";
import { notFound } from "next/navigation";

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