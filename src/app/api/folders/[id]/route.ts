import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = params;

    const body = await req.json();
    const { name, description, color, icon, parentId } = body;

    // Get the folder first
    const folder = await prisma.folder.findFirst({
      where: {
        id,
        organizationId: session.organizationId,
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    // Check permissions: Admins/Owners can edit any folder, others need specific permissions
    const isAdminOrOwner = session.role === 'OWNER' || session.role === 'ADMIN';
    
    if (!isAdminOrOwner) {
      // Check if user is the creator or has explicit permissions
      if (folder.createdBy !== session.userId) {
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
      }
    }

    // If changing parent, validate it
    if (parentId !== undefined && parentId !== folder.parentId) {
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
      const targetParentId = parentId !== undefined ? parentId : folder.parentId;
      const targetName = name || folder.name;
      
      const existingFolder = await prisma.folder.findFirst({
        where: {
          organizationId: session.organizationId,
          parentId: targetParentId,
          name: targetName,
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
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(parentId !== undefined && { parentId }),
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

    // Get folder
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

    // Check permissions: Admins/Owners can delete any folder, others need specific permissions
    const isAdminOrOwner = session.role === 'OWNER' || session.role === 'ADMIN';
    
    if (!isAdminOrOwner) {
      // Check if user is the creator or has explicit permissions
      if (folder.createdBy !== session.userId) {
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
      }
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