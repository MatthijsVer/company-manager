// app/api/documents/[id]/content/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { calculateFileHash, sanitizeFileName } from "@/lib/config/file-security";
import { computePerms } from "@/lib/doc-permissions";

function slugifyTitle(title: string) {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s\-_.]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "untitled"
  );
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const { id } = params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.html !== "string") {
      return NextResponse.json({ error: "Missing html string in body" }, { status: 400 });
    }
    const rawTitle: string | undefined = typeof body.title === "string" ? body.title.trim() : undefined;

    const doc = await prisma.document.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { folder: { include: { permissions: true } }, permissions: true },
    });
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const perms = computePerms(session, doc);
    if (!perms.canEdit) {
      return NextResponse.json({ error: "You don't have permission to edit this document" }, { status: 403 });
    }

    // preserve blank paragraphs
    let html: string = body.html.replace(/<p>\s*<\/p>/g, "<p><br/></p>");

    const publicPath = join(process.cwd(), "public");
    const diskPath = join(publicPath, doc.fileUrl);
    const buf = Buffer.from(html, "utf8");
    const dir = diskPath.substring(0, diskPath.lastIndexOf("/"));
    await mkdir(dir, { recursive: true });
    await writeFile(diskPath, buf);

    const fileHash = await calculateFileHash(buf);

    let newFileName = doc.fileName;
    if (
      rawTitle &&
      (doc.mimeType === "text/html" ||
        doc.fileName.toLowerCase().endsWith(".html") ||
        doc.fileName.toLowerCase().endsWith(".htm"))
    ) {
      const base = slugifyTitle(rawTitle);
      const ext = doc.fileName.toLowerCase().endsWith(".htm") ? ".htm" : ".html";
      newFileName = sanitizeFileName(`${base}${ext}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.document.update({
        where: { id },
        data: {
          fileSize: buf.byteLength,
          fileHash,
          version: (doc.version ?? 1) + 1,
          lastModifiedBy: session.userId,
          fileName: newFileName,
        },
      });

      await tx.documentActivity.create({
        data: {
          documentId: id,
          userId: session.userId,
          action: "edited",
          metadata: { fileNameBefore: doc.fileName, fileNameAfter: newFileName, bytes: buf.byteLength },
        },
      });

      return saved;
    });

    return NextResponse.json({ ok: true, id: updated.id, version: updated.version, fileName: updated.fileName });
  } catch (e) {
    console.error("Failed to update document content:", e);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
