import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
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

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error("Failed to fetch invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Verify invoice exists and belongs to organization
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Update invoice in transaction to handle lines
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Delete existing lines
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: params.id }
      });

      // Calculate totals from lines
      let subtotal = 0;
      let taxTotal = 0;

      const lines = body.lines || [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineSubtotal = Number(line.quantity || 0) * Number(line.unitPrice || 0);
        const lineTaxAmount = Number(line.taxAmount || 0);
        
        subtotal += lineSubtotal;
        taxTotal += lineTaxAmount;
      }

      const total = subtotal + taxTotal;
      const amountDue = total - Number(existingInvoice.amountPaid || 0);

      // Update invoice
      const invoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          currency: body.currency,
          companyId: body.companyId,
          contactId: body.contactId,
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          paymentTerms: body.paymentTerms,
          notesCustomer: body.notesCustomer,
          notesInternal: body.notesInternal,
          subtotal,
          taxTotal,
          total,
          amountDue,
          updatedBy: session.userId,
        },
      });

      // Create new lines
      if (lines.length > 0) {
        await tx.invoiceLine.createMany({
          data: lines.map((line: any, index: number) => ({
            invoiceId: params.id,
            productId: line.productId || null,
            variantId: line.variantId || null,
            sku: line.sku || null,
            name: line.name,
            description: line.description || null,
            unitId: line.unitId || null,
            unitLabel: line.unitLabel || null,
            quantity: Number(line.quantity || 0),
            unitPrice: Number(line.unitPrice || 0),
            discountPct: line.discountPct ? Number(line.discountPct) : null,
            taxRatePct: line.taxRatePct ? Number(line.taxRatePct) : null,
            taxAmount: Number(line.taxAmount || 0),
            lineSubtotal: Number(line.quantity || 0) * Number(line.unitPrice || 0),
            lineTotal: (Number(line.quantity || 0) * Number(line.unitPrice || 0)) + Number(line.taxAmount || 0),
            position: index,
          }))
        });
      }

      return invoice;
    });

    // Fetch updated invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id },
      include: {
        company: true,
        contact: true,
        lines: { orderBy: { position: "asc" } },
        payments: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be deleted" },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete invoice" },
      { status: 500 }
    );
  }
}