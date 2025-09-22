// src/lib/doc-permissions.ts
import { prisma } from "@/lib/db";
import { OrgRole } from "@prisma/client";

type SessionLike = { userId: string; organizationId?: string | null; role?: OrgRole | null };

export type EffectivePerms = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  // optionally expose why:
  source: "ADMIN" | "UPLOADER" | "DOC_USER" | "DOC_ROLE" | "FOLDER_USER" | "FOLDER_ROLE" | "NONE";
};

export async function loadDocForPerms(documentId: string, orgId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, organizationId: orgId },
    include: {
      folder: { include: { permissions: true } },
      permissions: true,
    },
  });
}

export function computePerms(session: SessionLike, doc: NonNullable<Awaited<ReturnType<typeof loadDocForPerms>>>): EffectivePerms {
  const admin = session.role === "OWNER" || session.role === "ADMIN";
  if (admin) return { canView: true, canEdit: true, canDelete: true, canShare: true, source: "ADMIN" };

  if (doc.uploadedBy === session.userId)
    return { canView: true, canEdit: true, canDelete: true, canShare: true, source: "UPLOADER" };

  // Document-level explicit (user/role)
  for (const p of doc.permissions) {
    if (p.userId === session.userId || (p.role && p.role === session.role)) {
      if (p.canView || p.canEdit || p.canDelete || p.canShare) {
        return {
          canView: !!p.canView || !!p.canEdit || !!p.canDelete, // edit/delete imply view
          canEdit: !!p.canEdit,
          canDelete: !!p.canDelete,
          canShare: !!p.canShare,
          source: p.userId ? "DOC_USER" : "DOC_ROLE",
        };
      }
    }
  }

  // Folder-level fallback (inherit)
  for (const p of doc.folder.permissions) {
    if (p.userId === session.userId || (p.role && p.role === session.role)) {
      return {
        canView: !!p.canView || !!p.canEdit || !!p.canDelete,
        canEdit: !!p.canEdit,
        canDelete: !!p.canDelete,
        canShare: !!p.canShare,
        source: p.userId ? "FOLDER_USER" : "FOLDER_ROLE",
      };
    }
  }

  // Open-by-default if no explicit rules at folder/document level (optional)
  const openByDefault = doc.folder.permissions.length === 0 && doc.permissions.length === 0;
  if (openByDefault) {
    return { canView: true, canEdit: false, canDelete: false, canShare: false, source: "NONE" };
  }

  return { canView: false, canEdit: false, canDelete: false, canShare: false, source: "NONE" };
}
