// app/api/tasks/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isAfter } from "date-fns";
import { z } from "zod";
import { cache, CACHE_TTL, CACHE_KEYS } from "@/lib/cache";

const querySchema = z.object({
  view: z.enum(["today", "week"]).optional().default("today"),
  limit: z.string().transform(Number).optional().default("20"),
  includeCompleted: z
    .union([z.boolean(), z.string().transform((val) => val === "true")])
    .optional()
    .default(true),
  companyId: z.string().optional(), // Optional filter by specific company
  boardId: z.string().optional(),   // Optional filter by specific board
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session?.organizationId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 401 });
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.parse(searchParams);

    // Generate cache key based on user, org, and query params
    const cacheKey = cache.key(
      CACHE_KEYS.DAILY_TASKS,
      session.organizationId,
      session.userId,
      query.view,
      query.limit.toString(),
      query.includeCompleted.toString(),
      query.companyId || "all",
      query.boardId || "all"
    );

    // Try to get from cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for daily tasks: ${session.userId}`);
      return NextResponse.json(cachedData);
    }

    console.log(`Cache miss for daily tasks: ${session.userId}`);

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (query.view === "today") {
      startDate = startOfDay(now);
      endDate = endOfDay(now);
    } else {
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    // First, get all boards the user has access to
    const accessibleBoards = await prisma.kanbanBoardConfig.findMany({
      where: {
        organizationId: session.organizationId,
        OR: [
          // Public boards
          { isPublic: true },
          // Boards created by the user
          { createdBy: session.userId },
          // Boards with explicit permissions
          {
            permissions: {
              some: {
                userId: session.userId,
                canView: true,
              },
            },
          },
          // Boards for companies the user is assigned to
          {
            company: {
              assignedUsers: {
                some: {
                  userId: session.userId,
                },
              },
            },
          },
        ],
        // Optional filters
        ...(query.companyId && { companyId: query.companyId }),
        ...(query.boardId && { id: query.boardId }),
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        company: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

    const boardIds = accessibleBoards.map(board => board.id);

    // Now fetch all tasks from these boards
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: session.organizationId,
        // Tasks from accessible boards OR assigned directly to user
        OR: [
          { boardId: { in: boardIds } },
          { assignedToId: session.userId },
        ],
        // Include tasks with due dates in the selected period OR overdue tasks
        AND: [
          {
            OR: [
              {
                dueDate: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              {
                // Include overdue tasks
                AND: [
                  { dueDate: { lt: now } },
                  { status: { not: "COMPLETED" } },
                ],
              },
              {
                // Include tasks without due dates but assigned to user
                AND: [
                  { dueDate: null },
                  { assignedToId: session.userId },
                  { status: { not: "COMPLETED" } },
                ],
              },
            ],
          },
        ],
        // Optionally filter out completed tasks
        ...(query.includeCompleted ? {} : { status: { not: "COMPLETED" } }),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
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
          },
        },
        timeEntries: {
          where: { userId: session.userId },
          select: { duration: true },
        },
        comments: {
          select: { id: true },
        },
        attachments: {
          select: { id: true },
        },
        subtasks: {
          where: { status: { not: "COMPLETED" } },
          select: { id: true },
        },
      },
      orderBy: [
        // First show overdue tasks
        { dueDate: "asc" },
        // Then by priority
        { priority: "desc" },
        // Then by status
        { status: "asc" },
        // Then by creation date
        { createdAt: "desc" },
      ],
      take: query.limit,
    });

    // Transform tasks to frontend format
    const transformedTasks = tasks.map((task) => {
      const isOverdue = task.dueDate ? isAfter(now, task.dueDate) && task.status !== "COMPLETED" : false;
      
      // Get board column info from settings if available
      let columnName = task.status;
      if (task.board?.settings && typeof task.board.settings === 'object') {
        const settings = task.board.settings as any;
        const column = settings.columns?.find((col: any) => col.id === task.columnId);
        if (column) {
          columnName = column.title;
        }
      }
      
      return {
        id: task.id,
        title: task.name,
        description: task.description,
        deadline: task.dueDate,
        priority: task.priority.toLowerCase(),
        completed: task.status === "COMPLETED",
        status: task.status,
        columnName,
        project: task.company?.name || task.board?.name || "Personal",
        projectColor: task.company?.color || "#6b7280",
        boardName: task.board?.name,
        boardId: task.boardId,
        isOverdue,
        isAssignedToMe: task.assignedToId === session.userId,
        assignedTo: task.assignedTo,
        reporter: task.reporter,
        totalTimeSpent: task.timeEntries.reduce((sum, entry) => sum + entry.duration, 0),
        commentsCount: task.comments.length,
        attachmentsCount: task.attachments.length,
        subtasksCount: task.subtasks.length,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
      };
    });

    // Group tasks by board/project for summary
    const tasksByProject = transformedTasks.reduce((acc, task) => {
      const key = task.project;
      if (!acc[key]) {
        acc[key] = {
          name: key,
          color: task.projectColor,
          count: 0,
          completed: 0,
        };
      }
      acc[key].count++;
      if (task.completed) acc[key].completed++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate summary statistics
    const summary = {
      total: transformedTasks.length,
      completed: transformedTasks.filter(t => t.completed).length,
      overdue: transformedTasks.filter(t => t.isOverdue).length,
      highPriority: transformedTasks.filter(t => t.priority === "urgent" || t.priority === "high").length,
      byProject: Object.values(tasksByProject),
      boardsIncluded: accessibleBoards.length,
    };

    const responseData = {
      tasks: transformedTasks,
      summary,
      boards: accessibleBoards,
      period: {
        view: query.view,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      cached: false,
      cacheStatus: cache.getStatus(),
    };

    // Cache the response
    // Use shorter TTL for "today" view since it changes more frequently
    const ttl = query.view === "today" ? CACHE_TTL.SHORT : CACHE_TTL.MEDIUM;
    await cache.set(cacheKey, responseData, ttl);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid query parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// Toggle task completion
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    const { taskId, completed } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify user has access to this task
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
        OR: [
          { assignedToId: session.userId },
          {
            board: {
              OR: [
                { isPublic: true },
                { createdBy: session.userId },
                {
                  permissions: {
                    some: {
                      userId: session.userId,
                      canEdit: true,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        completedAt: completed ? new Date() : null,
        actualHours: completed && task.estimatedHours 
          ? await calculateActualHours(taskId) 
          : task.actualHours,
      },
    });

    // Invalidate cache for this user and organization
    await cache.invalidateUserCaches(session.userId, session.organizationId);
    
    // Also invalidate for the task assignee if different
    if (task.assignedToId && task.assignedToId !== session.userId) {
      await cache.invalidateUserCaches(task.assignedToId, session.organizationId);
    }

    // Create activity log
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: session.userId,
        userEmail: session.email,
        action: "update",
        entityType: "task",
        entityId: taskId,
        entityName: task.name,
        changes: {
          before: { status: task.status, completedAt: task.completedAt },
          after: { status: updatedTask.status, completedAt: updatedTask.completedAt },
        },
      },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: updatedTask.id,
        status: updatedTask.status,
        completed: updatedTask.status === "COMPLETED",
        completedAt: updatedTask.completedAt,
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// Helper function to calculate actual hours from time entries
async function calculateActualHours(taskId: string): Promise<number> {
  const timeEntries = await prisma.timeEntry.findMany({
    where: { taskId },
    select: { duration: true },
  });
  
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
  return totalSeconds / 3600; // Convert to hours
}