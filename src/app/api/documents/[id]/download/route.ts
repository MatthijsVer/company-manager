// app/api/documents/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { computePerms, loadDocForPerms } from "@/lib/doc-permissions";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { id } = params;

    const doc = await loadDocForPerms(id, session.organizationId!);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const perms = computePerms(session, doc);
    if (!perms.canView) {
      return NextResponse.json({ error: "You don't have permission to download this document" }, { status: 403 });
    }

    await prisma.documentActivity.create({
      data: { documentId: id, userId: session.userId, action: "downloaded", metadata: { fileName: doc.fileName } },
    });

    return NextResponse.redirect(new URL(doc.fileUrl, req.url));
  } catch (error) {
    console.error("Failed to download document:", error);
    return NextResponse.json({ error: "Failed to download document" }, { status: 500 });
  }
}
