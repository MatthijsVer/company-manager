// app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { 
  validateFile, 
  generateSecureFilePath, 
  calculateFileHash,
  FILE_SECURITY 
} from "@/lib/config/file-security";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const folderId = searchParams.get("folderId");
    const companyId = searchParams.get("companyId");
    const isTemplate = searchParams.get("isTemplate");

    const where: any = {
      organizationId: session.organizationId,
    };

    if (folderId) where.folderId = folderId;
    if (isTemplate !== null) where.isTemplate = isTemplate === "true";

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            parentId: true,
            color: true,
          },
        },
        companyLinks: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        activities: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    // Transform documents
    const transformedDocuments = documents.map(doc => ({
      ...doc,
      companies: doc.companyLinks.map(link => link.company),
      tags: doc.tags ? JSON.parse(doc.tags) : [],
      lastActivity: doc.activities[0] || null,
    }));

    // Filter by company if specified
    let filteredDocuments = transformedDocuments;
    if (companyId) {
      filteredDocuments = transformedDocuments.filter(doc =>
        doc.companies.some(c => c.id === companyId)
      );
    }

    return NextResponse.json({ documents: filteredDocuments });
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folderId = formData.get("folderId") as string;
    const description = formData.get("description") as string;
    const tagsJson = formData.get("tags") as string;
    const isTemplate = formData.get("isTemplate") === "true";
    const linkedCompaniesJson = formData.get("linkedCompanies") as string;

    if (!file || !folderId) {
      return NextResponse.json(
        { error: "File and folder are required" },
        { status: 400 }
      );
    }

    // Validate file for security
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check folder exists and user has permission
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        organizationId: session.organizationId,
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    // Check permissions
    const permission = await prisma.folderPermission.findFirst({
      where: {
        folderId,
        userId: session.userId,
        canEdit: true,
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "You don't have permission to upload to this folder" },
        { status: 403 }
      );
    }

    // Process file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Calculate file hash for integrity
    const fileHash = await calculateFileHash(buffer);
    
    // Generate secure file path
    const securePath = generateSecureFilePath(
      session.organizationId,
      folderId,
      file.name
    );
    
    const uploadPath = join(process.cwd(), "public", "uploads", securePath);
    const uploadDir = join(uploadPath, "..");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(uploadPath, buffer);
    
    const fileUrl = `/uploads/${securePath}`;

    // Parse tags and linked companies
    const tags = tagsJson ? JSON.parse(tagsJson) : [];
    const linkedCompanies = linkedCompaniesJson ? JSON.parse(linkedCompaniesJson) : [];

    // Create document with activity tracking
    const document = await prisma.$transaction(async (tx) => {
      // Create document
      const doc = await tx.document.create({
        data: {
          organizationId: session.organizationId,
          folderId,
          fileName: file.name,
          fileSize: file.size,
          fileUrl,
          mimeType: file.type,
          description,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          isTemplate,
          fileHash,
          scanStatus: 'pending', // Will be updated by background job
          uploadedBy: session.userId,
          companyLinks: {
            create: linkedCompanies.map((companyId: string) => ({
              companyId,
              linkedBy: session.userId,
            })),
          },
        },
        include: {
          uploadedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          folder: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          companyLinks: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      // Create activity log
      await tx.documentActivity.create({
        data: {
          documentId: doc.id,
          userId: session.userId,
          action: 'uploaded',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            folderId,
            folderName: folder.name,
          },
        },
      });

      // TODO: Queue virus scan job here
      // await queueVirusScan(doc.id, fileUrl);

      return doc;
    });

    // Transform response
    const transformedDocument = {
      ...document,
      companies: document.companyLinks.map(link => link.company),
      tags: document.tags ? JSON.parse(document.tags) : [],
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

