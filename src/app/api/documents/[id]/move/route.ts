// app/api/documents/[id]/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { computePerms, loadDocForPerms } from "@/lib/doc-permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { id } = params;
    const { targetFolderId } = await req.json();

    if (!targetFolderId) {
      return NextResponse.json({ error: "Target folder is required" }, { status: 400 });
    }

    const doc = await loadDocForPerms(id, session.organizationId!);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const perms = computePerms(session, doc);
    if (!perms.canEdit) {
      return NextResponse.json({ error: "You don't have permission to move this document" }, { status: 403 });
    }

    const targetFolder = await prisma.folder.findFirst({
      where: { id: targetFolderId, organizationId: session.organizationId },
      include: {
        permissions: {
          where: {
            OR: [{ userId: session.userId }, { role: session.role ?? undefined }],
          },
        },
      },
    });
    if (!targetFolder) return NextResponse.json({ error: "Target folder not found" }, { status: 404 });

    const isAdmin = session.role === "OWNER" || session.role === "ADMIN";
    const canEditTarget = isAdmin || targetFolder.permissions.some((p) => p.canEdit);
    if (!canEditTarget) {
      return NextResponse.json(
        { error: "You don't have permission to add documents to the target folder" },
        { status: 403 }
      );
    }

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: { folderId: targetFolderId, lastModifiedBy: session.userId },
      });

      await tx.documentActivity.create({
        data: {
          documentId: id,
          userId: session.userId,
          action: "moved",
          metadata: { fromFolderId: doc.folderId, toFolderId: targetFolderId },
        },
      });

      return updated;
    });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error("Failed to move document:", error);
    return NextResponse.json({ error: "Failed to move document" }, { status: 500 });
  }
}
