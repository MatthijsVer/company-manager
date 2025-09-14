import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = await params
    
    const task = await prisma.task.findFirst({
      where: {
        id: id,
        organizationId: session.organizationId!,
      },
      include: {
        assignedTo: true,
        reporter: true,
        subtasks: true,
        comments: {
          include: {
            user: true,
          },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to fetch task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { id } = await params

    const task = await prisma.task.update({
      where: {
        id: id,
      },
      data: {
        name: body.name,
        description: body.description,
        status: body.status,
        priority: body.priority,
        assignedToId: body.assignedToId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        estimatedHours: body.estimatedHours,
        position: body.position,
        columnOrder: body.columnOrder,
        completedAt: body.status === "COMPLETED" ? new Date() : null,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const session = await requireAuth();

    await prisma.task.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}