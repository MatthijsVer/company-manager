import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { status } = await req.json();

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

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'],
      PARTIAL: ['PAID', 'OVERDUE', 'CANCELLED'],
      OVERDUE: ['PAID', 'PARTIAL', 'CANCELLED'],
      PAID: ['REFUNDED'], // Allow refunds
      CANCELLED: [], // Final state
      REFUNDED: [], // Final state
    };

    if (!validTransitions[existingInvoice.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existingInvoice.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update status and set paidDate if marking as paid
    const updateData: any = {
      status,
      updatedBy: session.userId,
    };

    if (status === 'PAID' && !existingInvoice.paidDate) {
      updateData.paidDate = new Date();
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: true,
        contact: true,
        lines: { orderBy: { position: "asc" } },
        payments: true,
      },
    });

    return NextResponse.json(updatedInvoice);
  } catch (error: any) {
    console.error("Failed to update invoice status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invoice status" },
      { status: 500 }
    );
  }
}