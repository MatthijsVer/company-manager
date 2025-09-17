// app/api/companies/[id]/boards/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET all boards for a company
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId } = await params;

    // Check if user is admin
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        organizationId: session.organizationId!,
      },
      select: {
        role: true,
      },
    });

    const isAdmin = membership?.role === "ADMIN" || membership?.role === "OWNER";

    // Build where clause based on user role
    const whereClause: any = {
      companyId: companyId,
      organizationId: session.organizationId!,
    };

    // If not admin, apply permission filters
    if (!isAdmin) {
      whereClause.OR = [
        { isPublic: true },
        { createdBy: session.userId },
        {
          permissions: {
            some: {
              userId: session.userId,
              canView: true,
            },
          },
        },
      ];
    }

    const boards = await prisma.kanbanBoardConfig.findMany({
      where: whereClause,
      include: {
        permissions: {
          where: {
            userId: session.userId,
          },
        },
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
      ],
    });

    // If no boards exist, create a default one
    if (boards.length === 0) {
      const defaultBoard = await prisma.kanbanBoardConfig.create({
        data: {
          organizationId: session.organizationId!,
          companyId: companyId,
          name: "Main Board",
          isDefault: true,
          isPublic: true,
          createdBy: session.userId,
          settings: {
            columns: [
              {
                id: "TODO",
                title: "To Do",
                color: "#E5E7EB",
                bgColor: "#F9FAFB",
                textColor: "#111827",
                borderStyle: "solid",
                icon: "circle",
                isVisible: true,
                order: 0,
              },
              {
                id: "IN_PROGRESS",
                title: "In Progress",
                color: "#DBEAFE",
                bgColor: "#EFF6FF",
                textColor: "#1E40AF",
                borderStyle: "solid",
                icon: "alert-circle",
                limit: 5,
                isVisible: true,
                order: 1,
              },
              {
                id: "REVIEW",
                title: "In Review",
                color: "#FEF3C7",
                bgColor: "#FFFBEB",
                textColor: "#92400E",
                borderStyle: "solid",
                icon: "clock",
                isVisible: true,
                order: 2,
              },
              {
                id: "COMPLETED",
                title: "Done",
                color: "#D1FAE5",
                bgColor: "#F0FDF4",
                textColor: "#065F46",
                borderStyle: "solid",
                icon: "check-circle",
                isVisible: true,
                order: 3,
              },
            ],
            cardStyle: {
              showPriority: true,
              showAssignee: true,
              showDueDate: true,
              showDescription: true,
              showComments: true,
              showAttachments: true,
              showEstimate: false,
              showLabels: true,
              cardHeight: "normal",
              borderRadius: "1rem",
              shadow: "shadow-sm",
            },
            boardStyle: {
              backgroundColor: "#F9FAFB",
              columnSpacing: "0.5rem",
              showColumnLimits: true,
              showEmptyMessage: true,
              compactMode: false,
            },
          },
        },
      });
      
      return NextResponse.json({ boards: [defaultBoard] });
    }

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Failed to fetch boards:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}

// POST create a new board
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: companyId } = await params;
    const body = await req.json();

    // Use pre-built settings from client, or build from template as fallback
    const settings = body.settings || buildSettingsFromTemplate(body.template, body.columns);

    // If this is the first board, make it default
    const existingBoards = await prisma.kanbanBoardConfig.count({
      where: {
        companyId: companyId,
        organizationId: session.organizationId!,
      },
    });

    const board = await prisma.kanbanBoardConfig.create({
      data: {
        organizationId: session.organizationId!,
        companyId: companyId,
        name: body.name,
        isDefault: existingBoards === 0,
        isPublic: body.isPublic !== false, // Default to public if not specified
        createdBy: session.userId,
        settings: settings,
        permissions: {
          create: {
            userId: session.userId,
            canView: true,
            canEdit: true,
            canManageMembers: true,
          },
        },
      },
      include: {
        permissions: true,
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("Failed to create board:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}

function buildSettingsFromTemplate(templateId: string, columnNames?: string[]) {
  const colorSchemes = {
    TODO: { color: "#E5E7EB", bgColor: "#F9FAFB", textColor: "#111827" },
    IN_PROGRESS: { color: "#DBEAFE", bgColor: "#EFF6FF", textColor: "#1E40AF" },
    REVIEW: { color: "#FEF3C7", bgColor: "#FFFBEB", textColor: "#92400E" },
    DONE: { color: "#D1FAE5", bgColor: "#F0FDF4", textColor: "#065F46" },
    BLOCKED: { color: "#FEE2E2", bgColor: "#FEF2F2", textColor: "#991B1B" },
    DEFAULT: { color: "#E5E7EB", bgColor: "#F9FAFB", textColor: "#111827" },
  };

  const columns = (columnNames || []).map((name, index) => {
    // Try to match column name to a color scheme
    let colorScheme = colorSchemes.DEFAULT;
    const upperName = name.toUpperCase();
    
    if (upperName.includes("TODO") || upperName.includes("BACKLOG")) {
      colorScheme = colorSchemes.TODO;
    } else if (upperName.includes("PROGRESS") || upperName.includes("DOING")) {
      colorScheme = colorSchemes.IN_PROGRESS;
    } else if (upperName.includes("REVIEW") || upperName.includes("TEST")) {
      colorScheme = colorSchemes.REVIEW;
    } else if (upperName.includes("DONE") || upperName.includes("COMPLETE") || upperName.includes("CLOSED")) {
      colorScheme = colorSchemes.DONE;
    } else if (upperName.includes("BLOCK")) {
      colorScheme = colorSchemes.BLOCKED;
    }

    return {
      id: name.toUpperCase().replace(/\s+/g, "_"),
      title: name,
      ...colorScheme,
      borderStyle: "solid",
      icon: "circle",
      isVisible: true,
      order: index,
    };
  });

  return {
    columns,
    cardStyle: {
      showPriority: true,
      showAssignee: true,
      showDueDate: true,
      showDescription: true,
      showComments: true,
      showAttachments: true,
      showEstimate: templateId === "development",
      showLabels: true,
      cardHeight: "normal",
      borderRadius: "1rem",
      shadow: "shadow-sm",
    },
    boardStyle: {
      backgroundColor: "#F9FAFB",
      columnSpacing: "0.5rem",
      showColumnLimits: true,
      showEmptyMessage: true,
      compactMode: false,
    },
  };
}