import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    
    // Get document to verify ownership and get file path
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

    // Delete file from disk (in production, delete from cloud storage)
    if (document.fileUrl.startsWith("/uploads/")) {
      const filepath = join(process.cwd(), "public", document.fileUrl);
      try {
        await unlink(filepath);
      } catch (err) {
        console.error("Failed to delete file from disk:", err);
      }
    }

    // Delete from database (cascade will handle DocumentCompanyLink)
    await prisma.organizationDocument.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}