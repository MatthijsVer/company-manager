import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    // Get the quote with all its details
    const quote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
      include: {
        lines: {
          orderBy: { position: "asc" }
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if quote is in a valid state for conversion
    if (quote.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: "Only accepted quotes can be converted to invoices" },
        { status: 400 }
      );
    }

    // Check if quote already has an invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: { quoteId: quote.id }
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Quote has already been converted to an invoice" },
        { status: 400 }
      );
    }

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { number: "desc" },
      select: { number: true }
    });
    
    let nextNumber = "INV-2025-00001";
    if (lastInvoice?.number) {
      const match = lastInvoice.number.match(/INV-(\d{4})-(\d{5})/);
      if (match) {
        const year = new Date().getFullYear();
        const currentYear = parseInt(match[1]);
        const currentNum = parseInt(match[2]);
        
        if (year === currentYear) {
          nextNumber = `INV-${year}-${(currentNum + 1).toString().padStart(5, '0')}`;
        } else {
          nextNumber = `INV-${year}-00001`;
        }
      }
    }

    // Calculate due date (default 30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Create the invoice
      const newInvoice = await tx.invoice.create({
        data: {
          organizationId: session.organizationId!,
          number: nextNumber,
          status: "DRAFT",
          quoteId: quote.id,
          companyId: quote.companyId,
          contactId: quote.contactId,
          currency: quote.currency,
          subtotal: quote.subtotal,
          taxTotal: quote.taxTotal,
          total: quote.total,
          amountDue: quote.total,
          dueDate,
          paymentTerms: "Net 30",
          notesCustomer: quote.notesCustomer,
          notesInternal: quote.notesInternal,
          createdBy: session.userId!,
        },
      });

      // Convert quote lines to invoice lines
      if (quote.lines.length > 0) {
        await tx.invoiceLine.createMany({
          data: quote.lines.map((line, index) => ({
            invoiceId: newInvoice.id,
            productId: line.productId,
            variantId: line.variantId,
            sku: line.sku,
            name: line.name,
            description: line.description,
            unitId: line.unitId,
            unitLabel: line.unitLabel,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPct: line.discountPct,
            taxRatePct: line.taxRatePct,
            taxAmount: line.taxAmount,
            lineSubtotal: line.lineSubtotal,
            lineTotal: line.lineTotal,
            position: index,
          }))
        });
      }

      return newInvoice;
    });

    // Fetch the complete invoice with relations
    const completeInvoice = await prisma.invoice.findFirst({
      where: { id: invoice.id },
      include: {
        company: true,
        contact: true,
        lines: { orderBy: { position: "asc" } },
        quote: { select: { number: true } },
      },
    });

    return NextResponse.json(completeInvoice, { status: 201 });
  } catch (error: any) {
    console.error("Failed to convert quote to invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert quote to invoice" },
      { status: 500 }
    );
  }
}