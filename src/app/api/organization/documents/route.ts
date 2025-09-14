import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

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
    const category = searchParams.get("category");
    const isTemplate = searchParams.get("isTemplate");
    const isStarred = searchParams.get("isStarred");
    const companyId = searchParams.get("companyId");

    const where: any = {
      organizationId: session.organizationId,
    };

    if (category) where.category = category;
    if (isTemplate !== null) where.isTemplate = isTemplate === "true";
    if (isStarred !== null) where.isStarred = isStarred === "true";

    const documents = await prisma.organizationDocument.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        companies: {
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
      orderBy: [
        { isStarred: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Transform the response to flatten the companies relation
    const transformedDocuments = documents.map(doc => ({
      ...doc,
      companies: doc.companies.map(link => link.company),
      tags: doc.tags ? JSON.parse(doc.tags) : [],
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
    console.error("Failed to fetch organization documents:", error);
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
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const tagsJson = formData.get("tags") as string;
    const isTemplate = formData.get("isTemplate") === "true";
    const linkedCompaniesJson = formData.get("linkedCompanies") as string;

    if (!file || !category) {
      return NextResponse.json(
        { error: "File and category are required" },
        { status: 400 }
      );
    }

    // Save file to disk (in production, use cloud storage like S3)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), "public", "uploads", "documents");
    await mkdir(uploadDir, { recursive: true });
    
    const uniqueFilename = `${nanoid()}_${file.name}`;
    const filepath = join(uploadDir, uniqueFilename);
    await writeFile(filepath, buffer);
    
    const fileUrl = `/uploads/documents/${uniqueFilename}`;

    // Parse tags and linked companies
    const tags = tagsJson ? JSON.parse(tagsJson) : [];
    const linkedCompanies = linkedCompaniesJson ? JSON.parse(linkedCompaniesJson) : [];

    // Create document
    const document = await prisma.organizationDocument.create({
      data: {
        organizationId: session.organizationId,
        uploadedBy: session.userId,
        category,
        fileName: file.name,
        fileSize: file.size,
        fileUrl,
        mimeType: file.type,
        description,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        isTemplate,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
        companies: {
          create: linkedCompanies.map((companyId: string) => ({
            companyId,
            linkedBy: session.userId,
          })),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        companies: {
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

    // Transform response
    const transformedDocument = {
      ...document,
      companies: document.companies.map(link => link.company),
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
