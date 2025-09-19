import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Get all folders with their documents
    const folders = await prisma.folder.findMany({
      where: {
        organizationId: session.organizationId,
      },
      include: {
        documents: {
          include: {
            uploadedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
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
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
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
      orderBy: [
        { isSystemFolder: 'desc' },
        { name: 'asc' },
      ],
    });

    // Build folder tree structure
    const folderMap = new Map();
    const rootFolders = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        documentCount: folder.documents.length,
        totalSize: folder.documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      });
    });

    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id);
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return NextResponse.json({ folders: rootFolders });
  } catch (error) {
    console.error("Failed to fetch folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
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

    const body = await req.json();
    const { name, description, parentId, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Check if parent folder exists and belongs to same org
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          organizationId: session.organizationId,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    // Check for duplicate name at same level
    const existingFolder = await prisma.folder.findFirst({
      where: {
        organizationId: session.organizationId,
        parentId: parentId || null,
        name,
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: "A folder with this name already exists at this level" },
        { status: 400 }
      );
    }

    // Create folder
    const folder = await prisma.folder.create({
      data: {
        organizationId: session.organizationId,
        name,
        description,
        parentId,
        color,
        icon,
        createdBy: session.userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // For admins and owners, grant full permissions
    const isAdminOrOwner = session.role === 'OWNER' || session.role === 'ADMIN';
    
    // Set permissions for creator
    await prisma.folderPermission.create({
      data: {
        folderId: folder.id,
        userId: session.userId,
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: isAdminOrOwner,
        canManagePerms: isAdminOrOwner,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Failed to create folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
