import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify invoice exists and belongs to organization
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      include: {
        creator: {
          select: { name: true, email: true }
        }
      },
      orderBy: { receivedDate: "desc" }
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Verify invoice exists and belongs to organization
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Validate payment amount
    const paymentAmount = Number(body.amount);
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero" },
        { status: 400 }
      );
    }

    if (paymentAmount > Number(invoice.amountDue)) {
      return NextResponse.json(
        { error: "Payment amount cannot exceed the amount due" },
        { status: 400 }
      );
    }

    // Create payment and update invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment
      const payment = await tx.payment.create({
        data: {
          organizationId: session.organizationId!,
          invoiceId: params.id,
          amount: paymentAmount,
          currency: body.currency || invoice.currency,
          method: body.method,
          reference: body.reference || null,
          receivedDate: new Date(body.receivedDate),
          notes: body.notes || null,
          createdBy: session.userId!,
        },
        include: {
          creator: {
            select: { name: true, email: true }
          }
        }
      });

      // Calculate new amounts
      const totalPaid = Number(invoice.amountPaid) + paymentAmount;
      const amountDue = Number(invoice.total) - totalPaid;

      // Determine new status
      let newStatus = invoice.status;
      if (amountDue === 0) {
        newStatus = 'PAID';
      } else if (totalPaid > 0 && amountDue > 0) {
        newStatus = 'PARTIAL';
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          amountPaid: totalPaid,
          amountDue: amountDue,
          status: newStatus,
          paidDate: newStatus === 'PAID' ? new Date() : undefined,
          updatedBy: session.userId,
        },
      });

      return { payment, updatedInvoice };
    });

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to record payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}