import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;
    const { companyIds } = await req.json();

    if (!companyIds || !Array.isArray(companyIds)) {
      return NextResponse.json(
        { error: "Company IDs array is required" },
        { status: 400 }
      );
    }

    // Get document with permissions
    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
      include: {
        folder: {
          include: {
            permissions: {
              where: {
                userId: session.userId,
              },
            },
          },
        },
        companyLinks: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check share permission
    const canShare = document.folder.permissions.some(p => p.canShare) ||
                    document.uploadedBy === session.userId;

    if (!canShare) {
      return NextResponse.json(
        { error: "You don't have permission to share this document" },
        { status: 403 }
      );
    }

    // Verify all companies exist and belong to the organization
    const companies = await prisma.company.findMany({
      where: {
        id: { in: companyIds },
        organizationId: session.organizationId,
      },
    });

    if (companies.length !== companyIds.length) {
      return NextResponse.json(
        { error: "One or more companies not found" },
        { status: 404 }
      );
    }

    // Create new links (skip existing ones)
    const existingCompanyIds = document.companyLinks.map(link => link.companyId);
    const newCompanyIds = companyIds.filter(id => !existingCompanyIds.includes(id));

    if (newCompanyIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Create links
        await tx.docCompanyLink.createMany({
          data: newCompanyIds.map(companyId => ({
            documentId: id,
            companyId,
            linkedBy: session.userId,
          })),
        });

        // Create activity log
        await tx.documentActivity.create({
          data: {
            documentId: id,
            userId: session.userId,
            action: 'linked_companies',
            metadata: {
              companyIds: newCompanyIds,
              companyNames: companies
                .filter(c => newCompanyIds.includes(c.id))
                .map(c => c.name),
            },
          },
        });
      });
    }

    // Get updated document
    const updatedDocument = await prisma.document.findUnique({
      where: { id },
      include: {
        companyLinks: {
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

    return NextResponse.json({
      ...updatedDocument,
      companies: updatedDocument?.companyLinks.map(link => link.company),
    });
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
    const { id } = params;
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Get document with permissions
    const document = await prisma.document.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
      include: {
        folder: {
          include: {
            permissions: {
              where: {
                userId: session.userId,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Check share permission
    const canShare = document.folder.permissions.some(p => p.canShare) ||
                    document.uploadedBy === session.userId;

    if (!canShare) {
      return NextResponse.json(
        { error: "You don't have permission to unlink this document" },
        { status: 403 }
      );
    }

    // Delete link
    await prisma.$transaction(async (tx) => {
      await tx.docCompanyLink.deleteMany({
        where: {
          documentId: id,
          companyId,
        },
      });

      // Create activity log
      await tx.documentActivity.create({
        data: {
          documentId: id,
          userId: session.userId,
          action: 'unlinked_company',
          metadata: {
            companyId,
          },
        },
      });
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