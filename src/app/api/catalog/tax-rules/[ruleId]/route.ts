import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const session = await requireAuth();
    const { ruleId } = await params;
    const body = await req.json();

    // Verify rule exists and belongs to organization
    const existing = await prisma.taxRule.findFirst({
      where: {
        id: ruleId,
        organizationId: session.organizationId!,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tax rule not found" }, { status: 404 });
    }

    // Validate rate if provided
    if (body.rate !== undefined) {
      const rate = parseFloat(body.rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { error: "Tax rate must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Update tax rule
    const rule = await prisma.taxRule.update({
      where: { id: ruleId },
      data: {
        name: body.name ?? existing.name,
        rate: body.rate !== undefined ? new Decimal(body.rate) : existing.rate,
        country: body.country !== undefined ? body.country : existing.country,
        region: body.region !== undefined ? body.region : existing.region,
        postalPattern: body.postalPattern !== undefined ? body.postalPattern : existing.postalPattern,
        isCompound: body.isCompound ?? existing.isCompound,
        priority: body.priority ?? existing.priority,
      }
    });

    return NextResponse.json({
      ...rule,
      rate: rule.rate.toString()
    });
  } catch (error: any) {
    console.error("Failed to update tax rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update tax rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const session = await requireAuth();
    const { ruleId } = await params;

    // Verify rule exists and belongs to organization
    const rule = await prisma.taxRule.findFirst({
      where: {
        id: ruleId,
        organizationId: session.organizationId!,
      },
    });

    if (!rule) {
      return NextResponse.json({ error: "Tax rule not found" }, { status: 404 });
    }

    // Delete tax rule
    await prisma.taxRule.delete({
      where: { id: ruleId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete tax rule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete tax rule" },
      { status: 500 }
    );
  }
}