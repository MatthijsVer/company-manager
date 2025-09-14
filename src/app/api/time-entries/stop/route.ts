import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// POST - Stop running timer
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Find running timer
    const runningEntry = await prisma.timeEntry.findFirst({
      where: {
        userId: session.userId,
        isRunning: true,
      },
    });

    if (!runningEntry) {
      return NextResponse.json(
        { error: "No running timer found" },
        { status: 404 }
      );
    }

    // Calculate duration
    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - runningEntry.startTime.getTime()) / 1000
    );

    // Update entry
    const updated = await prisma.timeEntry.update({
      where: { id: runningEntry.id },
      data: {
        isRunning: false,
        endTime,
        duration,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to stop timer:", error);
    return NextResponse.json(
      { error: "Failed to stop timer" },
      { status: 500 }
    );
  }
}