import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    
    // Validate status
    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get current quote to validate transition
    const currentQuote = await prisma.quote.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId,
      },
    });

    if (!currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      ACCEPTED: ['CANCELLED'],
      REJECTED: [],
      EXPIRED: [],
      CANCELLED: [],
    };

    const allowedTransitions = validTransitions[currentQuote.status] || [];
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentQuote.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update the quote status
    const updatedQuote = await prisma.quote.update({
      where: { id: params.id },
      data: { 
        status,
        updatedBy: session.userId,
      },
      include: {
        lines: {
          orderBy: { position: "asc" }
        }
      }
    });

    // Convert Decimal fields to strings for JSON serialization
    return NextResponse.json({
      ...updatedQuote,
      subtotal: updatedQuote.subtotal.toString(),
      taxTotal: updatedQuote.taxTotal.toString(),
      total: updatedQuote.total.toString(),
      lines: updatedQuote.lines.map(line => ({
        ...line,
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
        discountPct: line.discountPct?.toString() || null,
        taxRatePct: line.taxRatePct?.toString() || null,
        taxAmount: line.taxAmount.toString(),
        lineSubtotal: line.lineSubtotal.toString(),
        lineTotal: line.lineTotal.toString(),
      })),
    });
  } catch (error) {
    console.error("Failed to update quote status:", error);
    return NextResponse.json(
      { error: "Failed to update quote status" },
      { status: 500 }
    );
  }
}