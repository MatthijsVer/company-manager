import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

// GET: list user rules
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const session = await requireAuth();
  const folder = await prisma.folder.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // admins can always manage; else require explicit canManagePerms
  const admin = session.role === "OWNER" || session.role === "ADMIN";
  if (!admin) {
    const you = await prisma.folderPermission.findFirst({
      where: { folderId: folder.id, userId: session.userId, canManagePerms: true },
    });
    if (!you) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.folderPermission.findMany({
    where: { folderId: folder.id, NOT: { userId: null } },
    select: { id: true, userId: true, canView: true, canEdit: true, canDelete: true, canShare: true, canManagePerms: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules });
}

// PUT: replace user rules
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const session = await requireAuth();
  const folder = await prisma.folder.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = session.role === "OWNER" || session.role === "ADMIN";
  if (!admin) {
    const you = await prisma.folderPermission.findFirst({
      where: { folderId: folder.id, userId: session.userId, canManagePerms: true },
    });
    if (!you) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(()=>null);
  const incoming: any[] = Array.isArray(body?.rules) ? body.rules : [];

  await prisma.$transaction(async (tx) => {
    // nuke only user-scoped rows (keep any role/global rows intact if you add them later)
    await tx.folderPermission.deleteMany({ where: { folderId: folder.id, NOT: { userId: null } } });
    if (incoming.length) {
      await tx.folderPermission.createMany({
        data: incoming.map(r => ({
          folderId: folder.id,
          userId: r.userId,
          canView: !!r.canView,
          canEdit: !!r.canEdit,
          canDelete: !!r.canDelete,
          canShare: !!r.canShare,
          canManagePerms: !!r.canManagePerms,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
