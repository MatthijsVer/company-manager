import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET board permissions
export async function GET(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { boardId } = await params;

    // Get board details
    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        organizationId: session.organizationId!,
      },
      include: {
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user has permission to view permissions
    const userPermission = board.permissions.find(
      (p) => p.userId === session.userId
    );
    
    const isCreator = board.createdBy === session.userId;
    const canManage = isCreator || userPermission?.canManageMembers;

    if (!canManage && !board.isPublic) {
      return NextResponse.json(
        { error: "Unauthorized to view permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isPublic: board.isPublic,
      permissions: board.permissions,
    });
  } catch (error) {
    console.error("Failed to fetch board permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

// PUT update board permissions
export async function PUT(
  req: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { boardId } = await params;
    const body = await req.json();

    // Check if user can manage permissions
    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        organizationId: session.organizationId!,
      },
      include: {
        permissions: {
          where: {
            userId: session.userId,
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isCreator = board.createdBy === session.userId;
    const canManage =
      isCreator || board.permissions[0]?.canManageMembers || false;

    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage permissions" },
        { status: 403 }
      );
    }

    // Update board public status
    await prisma.kanbanBoardConfig.update({
      where: { id: boardId },
      data: { isPublic: body.isPublic },
    });

    // Delete existing permissions
    await prisma.boardPermission.deleteMany({
      where: { boardId },
    });

    // Create new permissions
    if (!body.isPublic && body.permissions?.length > 0) {
      await prisma.boardPermission.createMany({
        data: body.permissions.map((perm: any) => ({
          boardId,
          userId: perm.userId,
          canView: perm.canView,
          canEdit: perm.canEdit,
          canManageMembers: perm.canManageMembers,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update board permissions:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}