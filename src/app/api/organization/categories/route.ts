// app/api/organization/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Get all unique categories from documents
    const documents = await prisma.organizationDocument.findMany({
      where: {
        organizationId: session.organizationId,
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    // Get stored categories (empty folders)
    const storedCategories = await prisma.organizationCategory.findMany({
      where: {
        organizationId: session.organizationId,
      },
    });

    // Combine and deduplicate
    const allCategories = new Set([
      ...documents.map(d => d.category),
      ...storedCategories.map(c => c.name),
    ]);

    return NextResponse.json({ 
      categories: Array.from(allCategories).filter(Boolean).sort() 
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Normalize category name (lowercase, replace spaces with underscores)
    const normalizedName = name.toLowerCase().replace(/\s+/g, '_');

    // Check if category already exists
    const existingCategory = await prisma.organizationCategory.findFirst({
      where: {
        organizationId: session.organizationId,
        name: normalizedName,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    // Create new category
    const category = await prisma.organizationCategory.create({
      data: {
        organizationId: session.organizationId,
        name: normalizedName,
        description,
        createdBy: session.userId,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const categoryName = searchParams.get("name");

    if (!categoryName) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Check if there are documents in this category
    const documentsInCategory = await prisma.organizationDocument.count({
      where: {
        organizationId: session.organizationId,
        category: categoryName,
      },
    });

    if (documentsInCategory > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with documents. Please move or delete documents first." },
        { status: 400 }
      );
    }

    // Delete the category from stored categories
    await prisma.organizationCategory.deleteMany({
      where: {
        organizationId: session.organizationId,
        name: categoryName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}