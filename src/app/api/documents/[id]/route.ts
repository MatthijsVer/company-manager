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
  
  // app/api/documents/[id]/move/route.ts
  export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await requireAuth();
      const { id } = params;
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
  
      // Check permissions: Admins/Owners can move any document
      const isAdminOrOwner = session.role === 'OWNER' || session.role === 'ADMIN';
      
      if (!isAdminOrOwner) {
        // For regular users, check if they uploaded the document or have edit permissions
        if (document.uploadedBy !== session.userId) {
          // Check permissions on source folder
          const sourcePermission = await prisma.folderPermission.findFirst({
            where: {
              folderId: document.folderId,
              userId: session.userId,
              canEdit: true,
            },
          });
  
          if (!sourcePermission) {
            return NextResponse.json(
              { error: "You don't have permission to move this document" },
              { status: 403 }
            );
          }
        }
        
        // Also check target folder permission for non-admins
        const targetPermission = await prisma.folderPermission.findFirst({
          where: {
            folderId: targetFolderId,
            userId: session.userId,
            canEdit: true,
          },
        });
  
        if (!targetPermission) {
          return NextResponse.json(
            { error: "You don't have permission to add documents to the target folder" },
            { status: 403 }
          );
        }
      }
  
      // Verify target folder exists and belongs to same organization
      const targetFolder = await prisma.folder.findFirst({
        where: {
          id: targetFolderId,
          organizationId: session.organizationId,
        },
      });
  
      if (!targetFolder) {
        return NextResponse.json(
          { error: "Target folder not found" },
          { status: 404 }
        );
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
  
  // app/api/documents/[id]/download/route.ts
  export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await requireAuth();
      const { id } = params;
  
      // Get document
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
  
      // Check view permission
      const canView = document.folder.permissions.some(p => p.canView);
      if (!canView) {
        return NextResponse.json(
          { error: "You don't have permission to download this document" },
          { status: 403 }
        );
      }
  
      // Log download activity
      await prisma.documentActivity.create({
        data: {
          documentId: id,
          userId: session.userId,
          action: 'downloaded',
          metadata: {
            fileName: document.fileName,
          },
        },
      });
  
      // TODO: Stream file instead of redirecting
      return NextResponse.redirect(new URL(document.fileUrl, req.url));
    } catch (error) {
      console.error("Failed to download document:", error);
      return NextResponse.json(
        { error: "Failed to download document" },
        { status: 500 }
      );
    }
  }