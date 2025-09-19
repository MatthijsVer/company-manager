import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await requireAuth();
      const { id } = await params;
      const { targetFolderId } = await req.json();
  
      if (!targetFolderId) {
        return NextResponse.json(
          { error: "Target folder is required" },
          { status: 400 }
        );
      }
  
      // Get document
      const document = await prisma.document.findFirst({
        where: {
          id,
          organizationId: session.organizationId,
        },
      });
  
      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }
  
      // Check permissions: Admins/Owners can move any document, others need specific permissions
      const isAdminOrOwner = session.role === 'OWNER' || session.role === 'ADMIN';
      
      if (!isAdminOrOwner) {
        // Check permissions on both source and target folders
        const [sourcePermission, targetPermission] = await Promise.all([
          prisma.folderPermission.findFirst({
            where: {
              folderId: document.folderId,
              userId: session.userId,
              canEdit: true,
            },
          }),
          prisma.folderPermission.findFirst({
            where: {
              folderId: targetFolderId,
              userId: session.userId,
              canEdit: true,
            },
          }),
        ]);
    
        if (!sourcePermission || !targetPermission) {
          return NextResponse.json(
            { error: "You don't have permission to move this document" },
            { status: 403 }
          );
        }
      }
  
      // Move document
      const updatedDocument = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.update({
          where: { id },
          data: {
            folderId: targetFolderId,
            lastModifiedBy: session.userId,
          },
        });
  
        // Create activity log
        await tx.documentActivity.create({
          data: {
            documentId: id,
            userId: session.userId,
            action: 'moved',
            metadata: {
              fromFolderId: document.folderId,
              toFolderId: targetFolderId,
            },
          },
        });
  
        return doc;
      });
  
      return NextResponse.json(updatedDocument);
    } catch (error) {
      console.error("Failed to move document:", error);
      return NextResponse.json(
        { error: "Failed to move document" },
        { status: 500 }
      );
    }
  }