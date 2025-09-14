// app/api/companies/[id]/boards/[boardId]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET tasks for a specific board
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId, boardId } = await params;

    // Verify board exists and user has access
    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        companyId: companyId,
        organizationId: session.organizationId!,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Fetch tasks associated with this board
    const tasks = await prisma.task.findMany({
      where: {
        boardId: boardId,
        companyId: companyId,
        organizationId: session.organizationId!,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        timeEntries: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        attachments: true,
        subtasks: true,
      },
      orderBy: [
        { columnOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to fetch board tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST create a new task for a specific board
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; boardId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId, boardId } = await params;
    const body = await req.json();

    // Verify board exists
    const board = await prisma.kanbanBoardConfig.findFirst({
      where: {
        id: boardId,
        companyId: companyId,
        organizationId: session.organizationId!,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get the highest columnOrder for the target status
    const highestOrder = await prisma.task.findFirst({
      where: {
        boardId: boardId,
        status: body.status || "TODO",
      },
      orderBy: {
        columnOrder: "desc",
      },
      select: {
        columnOrder: true,
      },
    });

    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId!,
        companyId: companyId,
        boardId: boardId,
        name: body.name,
        description: body.description || null,
        status: body.status || "TODO",
        priority: body.priority || "MEDIUM",
        reporterId: session.userId,
        assignedToId: body.assignedToId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        estimatedHours: body.estimatedHours || null,
        labels: body.labels || null,
        customFields: body.customFields || null,
        columnOrder: (highestOrder?.columnOrder || 0) + 1,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
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

    // Delete the board (tasks remain but are unassigned from board)
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