// app/api/folders/route.ts
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
        permissions: {
          where: {
            userId: session.userId,
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
    const { name, description, parentId: rawParentId, color, icon } = body;
    const parentId = rawParentId || null;
    
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

    // Set default permissions for creator
    await prisma.folderPermission.create({
      data: {
        folderId: folder.id,
        userId: session.userId,
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canManagePerms: true,
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

// app/api/folders/[id]/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    // Check if user has edit permission
    const permission = await prisma.folderPermission.findFirst({
      where: {
        folderId: id,
        userId: session.userId,
        canEdit: true,
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "You don't have permission to edit this folder" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, color, icon, parentId } = body;

    // Validate new parent if changing
    if (parentId !== undefined) {
      // Check for circular reference
      const wouldCreateCircularRef = await checkCircularReference(id, parentId);
      if (wouldCreateCircularRef) {
        return NextResponse.json(
          { error: "Cannot move folder to its own descendant" },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name at target level
    if (name || parentId !== undefined) {
      const existingFolder = await prisma.folder.findFirst({
        where: {
          organizationId: session.organizationId,
          parentId: parentId || null,
          name: name || undefined,
          NOT: { id },
        },
      });

      if (existingFolder) {
        return NextResponse.json(
          { error: "A folder with this name already exists at this level" },
          { status: 400 }
        );
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        name,
        description,
        color,
        icon,
        parentId,
        lastModifiedBy: session.userId,
      },
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Failed to update folder:", error);
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    // Check if user has delete permission
    const permission = await prisma.folderPermission.findFirst({
      where: {
        folderId: id,
        userId: session.userId,
        canDelete: true,
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "You don't have permission to delete this folder" },
        { status: 403 }
      );
    }

    // Check if folder has content
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        documents: { select: { id: true } },
        children: { select: { id: true } },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    if (folder.isSystemFolder) {
      return NextResponse.json(
        { error: "System folders cannot be deleted" },
        { status: 400 }
      );
    }

    if (folder.documents.length > 0 || folder.children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder with contents. Please delete or move all items first." },
        { status: 400 }
      );
    }

    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}

// Helper function to check for circular references
async function checkCircularReference(
  folderId: string,
  potentialParentId: string | null
): Promise<boolean> {
  if (!potentialParentId) return false;
  if (folderId === potentialParentId) return true;

  const descendants = await getDescendantIds(folderId);
  return descendants.includes(potentialParentId);
}

async function getDescendantIds(folderId: string): Promise<string[]> {
  const children = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: { id: true },
  });

  let allDescendants = children.map(c => c.id);
  
  for (const child of children) {
    const childDescendants = await getDescendantIds(child.id);
    allDescendants = [...allDescendants, ...childDescendants];
  }

  return allDescendants;
}