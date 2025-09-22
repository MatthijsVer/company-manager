// app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  validateFile,
  generateSecureFilePath,
  calculateFileHash,
} from "@/lib/config/file-security";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { computePerms } from "@/lib/doc-permissions"; // ✅ add

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const folderId = searchParams.get("folderId");
    const companyId = searchParams.get("companyId");
    const isTemplate = searchParams.get("isTemplate");

    const where: any = { organizationId: session.organizationId };
    if (folderId) where.folderId = folderId;
    if (isTemplate !== null) where.isTemplate = isTemplate === "true";

    const rawDocs = await prisma.document.findMany({
      where,
      include: {
        uploadedByUser: { select: { id: true, name: true, email: true, image: true } },
        // include minimal permission sets relevant to this user/role (fewer rows than full set)
        permissions: {
          where: {
            OR: [
              { userId: session.userId },
              { role: session.role ?? undefined },
            ],
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
            color: true,
            permissions: {
              where: {
                OR: [
                  { userId: session.userId },
                  { role: session.role ?? undefined },
                ],
              },
            },
          },
        },
        companyLinks: {
          include: { company: { select: { id: true, name: true, color: true } } },
        },
        activities: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    // permission filter
    const viewableDocs = rawDocs.filter((d) => computePerms(session, d).canView);

    // optional company filter
    const filtered = companyId
      ? viewableDocs.filter((doc) => doc.companyLinks.some((l) => l.company.id === companyId))
      : viewableDocs;

    const transformed = filtered.map((doc) => ({
      ...doc,
      companies: doc.companyLinks.map((l) => l.company),
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      lastActivity: doc.activities[0] || null,
    }));

    return NextResponse.json({ documents: transformed });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;
    const description = (formData.get("description") as string) || "";
    const tagsJson = (formData.get("tags") as string) || "[]";
    const isTemplate = formData.get("isTemplate") === "true";
    const linkedCompaniesJson = (formData.get("linkedCompanies") as string) || "[]";

    if (!file || !folderId) {
      return NextResponse.json({ error: "File and folder are required" }, { status: 400 });
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, organizationId: session.organizationId },
      include: {
        permissions: {
          where: {
            OR: [{ userId: session.userId }, { role: session.role ?? undefined }],
          },
        },
      },
    });
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    const isAdmin = session.role === "OWNER" || session.role === "ADMIN";
    const canEditFolder =
      isAdmin || folder.permissions.some((p) => p.canEdit === true);

    if (!canEditFolder) {
      return NextResponse.json(
        { error: "You don't have permission to upload to this folder" },
        { status: 403 }
      );
    }

    // write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileHash = await calculateFileHash(buffer);
    const securePath = generateSecureFilePath(session.organizationId, folderId, file.name);
    const uploadPath = join(process.cwd(), "public", "uploads", securePath);
    const uploadDir = join(uploadPath, "..");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, buffer);
    const fileUrl = `/uploads/${securePath}`;

    const tags = JSON.parse(tagsJson);
    const linkedCompanies = JSON.parse(linkedCompaniesJson);

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId: session.organizationId,
          folderId,
          fileName: file.name,
          fileSize: file.size,
          fileUrl,
          mimeType: file.type,
          description,
          tags: tags.length ? JSON.stringify(tags) : null,
          isTemplate,
          fileHash,
          scanStatus: "pending",
          uploadedBy: session.userId,
          companyLinks: {
            create: linkedCompanies.map((companyId: string) => ({
              companyId,
              linkedBy: session.userId,
            })),
          },
        },
        include: {
          uploadedByUser: { select: { id: true, name: true, email: true, image: true } },
          folder: { select: { id: true, name: true, color: true } },
          companyLinks: { include: { company: { select: { id: true, name: true, color: true } } } },
        },
      });

      await tx.documentActivity.create({
        data: {
          documentId: doc.id,
          userId: session.userId,
          action: "uploaded",
          metadata: { fileName: file.name, fileSize: file.size, folderId, folderName: folder.name },
        },
      });

      return doc;
    });

    const transformed = {
      ...document,
      companies: document.companyLinks.map((l) => l.company),
      tags: document.tags ? JSON.parse(document.tags) : [],
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

