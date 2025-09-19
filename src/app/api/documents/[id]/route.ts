import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// app/api/documents/[id]/route.ts
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await requireAuth();
      const { id } = params;
  
      // Get document with folder permissions
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
  
      // Check permissions
      const canDelete = document.folder.permissions.some(p => p.canDelete) ||
                       document.uploadedBy === session.userId;
  
      if (!canDelete) {
        return NextResponse.json(
          { error: "You don't have permission to delete this document" },
          { status: 403 }
        );
      }
  
      // Delete document and create activity log
      await prisma.$transaction(async (tx) => {
        // Create deletion activity
        await tx.documentActivity.create({
          data: {
            documentId: id,
            userId: session.userId,
            action: 'deleted',
            metadata: {
              fileName: document.fileName,
              folderId: document.folderId,
            },
          },
        });
  
        // Delete the document (cascades to related records)
        await tx.document.delete({
          where: { id },
        });
      });
  
      // TODO: Delete physical file
      // await deleteFile(document.fileUrl);
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to delete document:", error);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }
  }