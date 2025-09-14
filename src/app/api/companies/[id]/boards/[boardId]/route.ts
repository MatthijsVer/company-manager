// app/api/companies/[id]/boards/[boardId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET a specific board
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { boardId } = await params;

    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        organizationId: session.organizationId!,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Failed to fetch board:", error);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}

// PATCH update board settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { boardId } = await params;
    const body = await req.json();

    const board = await prisma.kanbanBoardConfig.updateMany({
      where: {
        id: boardId,
        organizationId: session.organizationId!,
      },
      data: {
        settings: body.settings,
        updatedAt: new Date(),
      },
    });

    if (board.count === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

// DELETE board
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { boardId } = await params;

    // Check if it's the default board
    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        organizationId: session.organizationId!,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default board" },
        { status: 400 }
      );
    }

    // Optional: Reassign tasks to default board instead of leaving them orphaned
    const defaultBoard = await prisma.kanbanBoardConfig.findFirst({
      where: {
        companyId: board.companyId,
        organizationId: session.organizationId!,
        isDefault: true,
      },
    });

    if (defaultBoard) {
      // Move all tasks from this board to the default board
      await prisma.task.updateMany({
        where: {
          boardId: boardId,
        },
        data: {
          boardId: defaultBoard.id,
        },
      });
    }

    // Delete the board
    await prisma.kanbanBoardConfig.delete({
      where: {
        id: boardId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}