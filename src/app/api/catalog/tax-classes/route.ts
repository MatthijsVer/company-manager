import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    const taxClasses = await prisma.taxClass.findMany({
      where: { organizationId: session.organizationId! },
      include: {
        rules: {
          orderBy: { priority: "asc" }
        },
        _count: {
          select: { Product: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(taxClasses);
  } catch (error: any) {
    console.error("Failed to fetch tax classes:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tax classes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Tax class name is required" },
        { status: 400 }
      );
    }

    // Create tax class
    const taxClass = await prisma.taxClass.create({
      data: {
        organizationId: session.organizationId!,
        name: body.name,
        description: body.description || null,
      },
      include: {
        rules: true
      }
    });

    return NextResponse.json(taxClass, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "A tax class with this name already exists" },
        { status: 400 }
      );
    }
    
    console.error("Failed to create tax class:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create tax class" },
      { status: 500 }
    );
  }
}