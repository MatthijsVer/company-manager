// app/api/companies/[id]/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET all tasks for a company (optionally filtered by boardId)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId } = await params;
    
    // Get optional boardId from query params
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");
    
    const whereClause: any = {
      companyId: companyId,
      organizationId: session.organizationId!,
    };
    
    // If boardId is provided, filter by it
    if (boardId) {
      whereClause.boardId = boardId;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
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

    // Transform tasks to parse labels JSON
    const transformedTasks = tasks.map((task: any) => {
      let parsedLabels = [];
      try {
        parsedLabels = task.labels ? JSON.parse(task.labels) : [];
      } catch (error) {
        console.error("Failed to parse task labels:", error, task.labels);
        parsedLabels = [];
      }
      
      return {
        ...task,
        labels: parsedLabels
      };
    });

    return NextResponse.json({ tasks: transformedTasks });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST create a new task for a company
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId } = await params;
    const body = await req.json();

    // If boardId is provided, verify it exists
    if (body.boardId) {
      const board = await prisma.kanbanBoardConfig.findFirst({
        where: {
          id: body.boardId,
          companyId: companyId,
          organizationId: session.organizationId!,
        },
      });

      if (!board) {
        return NextResponse.json(
          { error: "Board not found" },
          { status: 404 }
        );
      }
    } else {
      // If no boardId provided, get the default board for this company
      const defaultBoard = await prisma.kanbanBoardConfig.findFirst({
        where: {
          companyId: companyId,
          organizationId: session.organizationId!,
          isDefault: true,
        },
      });

      if (defaultBoard) {
        body.boardId = defaultBoard.id;
      }
    }

    // Get the highest columnOrder for the target status
    const highestOrder = await prisma.task.findFirst({
      where: {
        companyId: companyId,
        boardId: body.boardId || null,
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
        boardId: body.boardId || null,
        name: body.name,
        description: body.description || null,
        status: body.status || "TODO",
        priority: body.priority || "MEDIUM",
        reporterId: session.userId,
        assignedToId: body.assignedToId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        estimatedHours: body.estimatedHours || null,
        labels: body.labels ? JSON.stringify(body.labels) : null,
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