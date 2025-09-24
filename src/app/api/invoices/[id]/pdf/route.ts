import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import InvoicePDF from "@/components/invoices/InvoicePDF";
import React from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Get invoice with all related data
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
      include: {
        company: true,
        contact: true,
        lines: {
          orderBy: { position: "asc" }
        },
        payments: {
          orderBy: { receivedDate: "desc" }
        }
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId! },
    });

    // Convert Decimal fields to strings for PDF rendering
    const invoiceForPDF = {
      ...invoice,
      subtotal: invoice.subtotal.toString(),
      taxTotal: invoice.taxTotal.toString(),
      total: invoice.total.toString(),
      amountDue: invoice.amountDue.toString(),
      amountPaid: invoice.amountPaid.toString(),
      lines: invoice.lines.map((line: any) => ({
        ...line,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountPct: line.discountPct?.toString() || null,
        taxRatePct: line.taxRatePct?.toString() || null,
        taxAmount: line.taxAmount.toString(),
        lineSubtotal: line.lineSubtotal.toString(),
        lineTotal: line.lineTotal.toString(),
      })),
      payments: invoice.payments.map((payment: any) => ({
        ...payment,
        amount: payment.amount.toString(),
      }))
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, { invoice: invoiceForPDF, organization })
    );

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate invoice PDF:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}