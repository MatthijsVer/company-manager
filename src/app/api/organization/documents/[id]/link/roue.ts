import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { companyIds } = body;

    if (!Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "Company IDs are required" },
        { status: 400 }
      );
    }

    // Verify document belongs to organization
    const document = await prisma.organizationDocument.findFirst({
      where: {
        id: params.id,
        organizationId: session.organizationId!,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Create links (upsert to avoid duplicates)
    await Promise.all(
      companyIds.map(companyId =>
        prisma.documentCompanyLink.upsert({
          where: {
            documentId_companyId: {
              documentId: params.id,
              companyId,
            },
          },
          update: {
            linkedBy: session.userId,
            linkedAt: new Date(),
          },
          create: {
            documentId: params.id,
            companyId,
            linkedBy: session.userId,
          },
        })
      )
    );

    // Fetch updated document
    const updatedDocument = await prisma.organizationDocument.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const transformedDocument = {
      ...updatedDocument,
      companies: updatedDocument!.companies.map(link => link.company),
      tags: updatedDocument!.tags ? JSON.parse(updatedDocument!.tags) : [],
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error("Failed to link companies:", error);
    return NextResponse.json(
      { error: "Failed to link companies" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Delete the link
    await prisma.documentCompanyLink.delete({
      where: {
        documentId_companyId: {
          documentId: params.id,
          companyId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unlink company:", error);
    return NextResponse.json(
      { error: "Failed to unlink company" },
      { status: 500 }
    );
  }
}