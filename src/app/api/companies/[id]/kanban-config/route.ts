import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET board configuration
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    
    let config = await prisma.kanbanBoardConfig.findFirst({
      where: {
        companyId: params.id,
        organizationId: session.organizationId!,
      },
    });

    // If no config exists, create default
    if (!config) {
      config = await prisma.kanbanBoardConfig.create({
        data: {
          organizationId: session.organizationId!,
          companyId: params.id,
          createdBy: session.userId,
          settings: DEFAULT_BOARD_SETTINGS,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to fetch kanban config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

// PUT update board configuration
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    const config = await prisma.kanbanBoardConfig.upsert({
      where: {
        organizationId_companyId_name: {
          organizationId: session.organizationId!,
          companyId: params.id,
          name: body.name || "Default Board",
        },
      },
      update: {
        settings: body.settings,
      },
      create: {
        organizationId: session.organizationId!,
        companyId: params.id,
        createdBy: session.userId,
        name: body.name || "Default Board",
        settings: body.settings,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to update kanban config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

const DEFAULT_BOARD_SETTINGS = {
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
    cardHeight: "normal",
    borderRadius: "1rem",
    shadow: "shadow-sm",
  },
  boardStyle: {
    backgroundColor: "#F9FAFB",
    columnSpacing: "0.5rem",
    showColumnLimits: true,
    showEmptyMessage: true,
    compactMode: true,
  },
};