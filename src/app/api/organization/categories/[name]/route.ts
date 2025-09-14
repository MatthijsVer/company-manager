// app/api/organization/categories/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { newName } = body;
    const oldName = decodeURIComponent(params.name);

    if (!newName) {
      return NextResponse.json(
        { error: "New category name is required" },
        { status: 400 }
      );
    }

    // Normalize new category name
    const normalizedNewName = newName.toLowerCase().replace(/\s+/g, '_');

    if (normalizedNewName === oldName) {
      return NextResponse.json(
        { error: "New name is the same as the old name" },
        { status: 400 }
      );
    }

    // Check if new name already exists
    const existingCategory = await prisma.organizationCategory.findFirst({
      where: {
        organizationId: session.organizationId,
        name: normalizedNewName,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 }
      );
    }

    // Begin transaction to update both the category and any documents
    await prisma.$transaction(async (tx) => {
      // Update the category in stored categories
      await tx.organizationCategory.updateMany({
        where: {
          organizationId: session.organizationId,
          name: oldName,
        },
        data: {
          name: normalizedNewName,
        },
      });

      // Update any documents that have this category
      await tx.organizationDocument.updateMany({
        where: {
          organizationId: session.organizationId,
          category: oldName,
        },
        data: {
          category: normalizedNewName,
        },
      });
    });

    return NextResponse.json({ 
      success: true, 
      oldName,
      newName: normalizedNewName 
    });
  } catch (error) {
    console.error("Failed to rename category:", error);
    return NextResponse.json(
      { error: "Failed to rename category" },
      { status: 500 }
    );
  }
}