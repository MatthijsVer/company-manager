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

    const taxClass = await prisma.taxClass.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
      },
      include: {
        rules: {
          orderBy: { priority: "asc" }
        },
        _count: {
          select: { Product: true }
        }
      }
    });

    if (!taxClass) {
      return NextResponse.json({ error: "Tax class not found" }, { status: 404 });
    }

    return NextResponse.json(taxClass);
  } catch (error: any) {
    console.error("Failed to fetch tax class:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tax class" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Verify tax class exists and belongs to organization
    const existing = await prisma.taxClass.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tax class not found" }, { status: 404 });
    }

    // Update tax class
    const taxClass = await prisma.taxClass.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
      },
      include: {
        rules: {
          orderBy: { priority: "asc" }
        }
      }
    });

    return NextResponse.json(taxClass);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A tax class with this name already exists" },
        { status: 400 }
      );
    }
    
    console.error("Failed to update tax class:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tax class" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify tax class exists and belongs to organization
    const taxClass = await prisma.taxClass.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
      },
      include: {
        _count: {
          select: { Product: true }
        }
      }
    });

    if (!taxClass) {
      return NextResponse.json({ error: "Tax class not found" }, { status: 404 });
    }

    // Prevent deletion if products are using this tax class
    if (taxClass._count.Product > 0) {
      return NextResponse.json(
        { error: "Cannot delete tax class that is assigned to products" },
        { status: 400 }
      );
    }

    // Delete tax class (rules will cascade delete)
    await prisma.taxClass.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete tax class:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete tax class" },
      { status: 500 }
    );
  }
}