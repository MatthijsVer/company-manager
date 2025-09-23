import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    
    const where: any = {
      organizationId: session.organizationId,
    };
    
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          company: true,
          contact: true,
          creator: {
            select: { name: true, email: true }
          },
          quote: {
            select: { number: true }
          },
          _count: {
            select: { payments: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where })
    ]);
    
    return NextResponse.json({
      items: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    
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
    
    // Calculate due date (default 30 days)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: session.organizationId!,
        number: nextNumber,
        status: "DRAFT",
        currency: body.currency || "EUR",
        subtotal: 0,
        taxTotal: 0,
        total: 0,
        amountDue: 0,
        dueDate,
        createdBy: session.userId!,
        quoteId: body.quoteId || null,
        companyId: body.companyId || null,
        contactId: body.contactId || null,
        paymentTerms: body.paymentTerms || "Net 30",
        notesCustomer: body.notesCustomer || null,
        notesInternal: body.notesInternal || null,
      },
      include: {
        company: true,
        contact: true,
        lines: true,
      },
    });
    
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}