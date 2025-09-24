import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function GET(
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
    });

    if (!taxClass) {
      return NextResponse.json({ error: "Tax class not found" }, { status: 404 });
    }

    const rules = await prisma.taxRule.findMany({
      where: { taxClassId: id },
      orderBy: { priority: "asc" }
    });

    // Convert Decimal to string for JSON serialization
    const rulesFormatted = rules.map(rule => ({
      ...rule,
      rate: rule.rate.toString()
    }));

    return NextResponse.json(rulesFormatted);
  } catch (error: any) {
    console.error("Failed to fetch tax rules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tax rules" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Verify tax class exists and belongs to organization
    const taxClass = await prisma.taxClass.findFirst({
      where: {
        id,
        organizationId: session.organizationId!,
      },
    });

    if (!taxClass) {
      return NextResponse.json({ error: "Tax class not found" }, { status: 404 });
    }

    // Validate required fields
    if (!body.name || body.rate === undefined) {
      return NextResponse.json(
        { error: "Rule name and rate are required" },
        { status: 400 }
      );
    }

    // Validate rate is between 0 and 100
    const rate = parseFloat(body.rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { error: "Tax rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Create tax rule
    const rule = await prisma.taxRule.create({
      data: {
        organizationId: session.organizationId!,
        taxClassId: id,
        name: body.name,
        rate: new Decimal(rate),
        country: body.country || null,
        region: body.region || null,
        postalPattern: body.postalPattern || null,
        isCompound: body.isCompound || false,
        priority: body.priority || 0,
      }
    });

    return NextResponse.json({
      ...rule,
      rate: rule.rate.toString()
    }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create tax rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create tax rule" },
      { status: 500 }
    );
  }
}