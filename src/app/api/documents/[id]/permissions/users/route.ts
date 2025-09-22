import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const session = await requireAuth();
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { folder: true },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = session.role === "OWNER" || session.role === "ADMIN" || doc.uploadedBy === session.userId;
  if (!admin) {
    const you = await prisma.documentPermission.findFirst({
      where: { documentId: doc.id, userId: session.userId, canShare: true },
    });
    if (!you) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.documentPermission.findMany({
    where: { documentId: doc.id, NOT: { userId: null } },
    select: { id: true, userId: true, canView: true, canEdit: true, canDelete: true, canShare: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params
  const session = await requireAuth();
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = session.role === "OWNER" || session.role === "ADMIN" || doc.uploadedBy === session.userId;
  if (!admin) {
    const you = await prisma.documentPermission.findFirst({
      where: { documentId: doc.id, userId: session.userId, canShare: true },
    });
    if (!you) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(()=>null);
  const incoming: any[] = Array.isArray(body?.rules) ? body.rules : [];

  await prisma.$transaction(async (tx) => {
    await tx.documentPermission.deleteMany({ where: { documentId: doc.id, NOT: { userId: null } } });
    if (incoming.length) {
      await tx.documentPermission.createMany({
        data: incoming.map(r => ({
          documentId: doc.id,
          userId: r.userId,
          canView: !!r.canView,
          canEdit: !!r.canEdit,
          canDelete: !!r.canDelete,
          canShare: !!r.canShare,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
