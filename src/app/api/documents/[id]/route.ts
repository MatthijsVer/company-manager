// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { computePerms, loadDocForPerms } from "@/lib/doc-permissions";

// DELETE /api/documents/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    // Load the document with just-enough permission context
    const doc = await loadDocForPerms(id, session.organizationId!);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const perms = computePerms(session, doc);
    if (!perms.canDelete) {
      return NextResponse.json(
        { error: "You don't have permission to delete this document" },
        { status: 403 }
      );
    }

    // Delete + activity log
    await prisma.$transaction(async (tx) => {
      await tx.documentActivity.create({
        data: {
          documentId: id,
          userId: session.userId,
          action: "deleted",
          metadata: {
            fileName: doc.fileName,
            folderId: doc.folderId,
          },
        },
      });

      await tx.document.delete({ where: { id } });
    });

    // (Optional TODO) delete file from disk / external storage

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

// GET /api/documents/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    // Load the document with minimal permission rows required by computePerms
    const doc = await loadDocForPerms(id, session.organizationId!);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const perms = computePerms(session, doc);
    if (!perms.canView) {
      return NextResponse.json(
        { error: "You don't have permission to view this document" },
        { status: 403 }
      );
    }

    // Enrich with uploader + companies for the client
    const hydrated = await prisma.document.findUnique({
      where: { id: doc.id },
      include: {
        uploadedByUser: { select: { id: true, name: true, email: true, image: true } },
        companyLinks: {
          include: { company: { select: { id: true, name: true, color: true } } },
        },
        folder: { select: { id: true, name: true, color: true, parentId: true } },
      },
    });

    if (!hydrated) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const transformed = {
      ...hydrated,
      companies: hydrated.companyLinks.map((l) => l.company),
      tags: hydrated.tags ? JSON.parse(hydrated.tags) : [],
    };

    return NextResponse.json(transformed);
  } catch (e) {
    console.error("Failed to fetch document:", e);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
