import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// GET all time entries for current user
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date");
    const companyId = searchParams.get("companyId");
    const isRunning = searchParams.get("isRunning");
    
    // Build filter conditions
    const where: any = { userId: session.userId };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    
    if (companyId) {
      where.companyId = companyId;
    }
    
    if (isRunning !== null) {
      where.isRunning = isRunning === "true";
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to fetch time entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch time entries" },
      { status: 500 }
    );
  }
}

// POST - Create new time entry
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    const body = await req.json();
    const {
      description,
      companyId,
      taskId,
      startTime,
      endTime,
      duration,
      isRunning,
      isInternal,
      isBillable,
    } = body;

    // Stop any running timers first
    if (isRunning) {
      await prisma.timeEntry.updateMany({
        where: {
          userId: session.userId,
          isRunning: true,
        },
        data: {
          isRunning: false,
          endTime: new Date(),
        },
      });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        userId: session.userId,
        description: description || "Untitled",
        companyId,
        taskId,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration || 0,
        isRunning: isRunning || false,
        isInternal: isInternal || false,
        isBillable: isBillable !== false,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        task: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Failed to create time entry:", error);
    return NextResponse.json(
      { error: "Failed to create time entry" },
      { status: 500 }
    );
  }
}
