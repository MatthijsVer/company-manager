// app/dashboard/documents/[id]/page.tsx
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OrgRole } from "@prisma/client";
import { join } from "path";
import { readFile } from "fs/promises";
import ViewerClient from "@/components/documents/ViewerClient";

function canView(session: any, doc: any): boolean {
  const isAdminOrOwner = session.role === "OWNER" || session.role === "ADMIN";
  if (isAdminOrOwner || doc.uploadedBy === session.userId) return true;

  const hasRule = doc.folder.permissions.some(
    (p: any) =>
      p.canView &&
      (p.userId === session.userId ||
        (p.role && p.role === (session.role as OrgRole)))
  );

  // optional: open-by-default if no rules exist
  return hasRule || doc.folder.permissions.length === 0;
}

function canEdit(session: any, doc: any): boolean {
  const isAdminOrOwner = session.role === "OWNER" || session.role === "ADMIN";
  if (isAdminOrOwner || doc.uploadedBy === session.userId) return true;

  return doc.folder.permissions.some(
    (p: any) =>
      p.canEdit &&
      (p.userId === session.userId ||
        (p.role && p.role === (session.role as OrgRole)))
  );
}

export default async function DocumentViewer({
  params: { id },
}: {
  params: { id: string };
}) {
  const session = await requireAuth();

  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { folder: { include: { permissions: true } } },
  });

  if (!doc || !canView(session, doc)) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Document not found</h1>
      </div>
    );
  }

  const isHtml =
    doc.mimeType === "text/html" ||
    doc.fileName.toLowerCase().endsWith(".html") ||
    doc.fileName.toLowerCase().endsWith(".htm");

  const editable = isHtml && canEdit(session, doc);

  // For inline edit, read the HTML now (server) and pass it down
  let initialHTML: string | null = null;
  if (editable) {
    try {
      const publicPath = join(process.cwd(), "public");
      const diskPath = join(publicPath, doc.fileUrl); // fileUrl starts with /uploads/...
      initialHTML = await readFile(diskPath, "utf8");
    } catch {
      initialHTML =
        "<!doctype html><html><body><article><p></p></article></body></html>";
    }
  }

  return (
    <ViewerClient
      docId={doc.id}
      fileName={doc.fileName}
      fileUrl={doc.fileUrl}
      isHtml={isHtml}
      editable={editable}
      initialHTML={initialHTML}
    />
  );
}
