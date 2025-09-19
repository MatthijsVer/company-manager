import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

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