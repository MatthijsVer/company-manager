// app/api/tasks/[id]/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// For production, you'd want to use a service like AWS S3, Cloudinary, or Supabase Storage
// This example uses local file storage for simplicity

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const attachments = await prisma.taskAttachment.findMany({
      where: {
        taskId: id,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Failed to fetch attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Check if task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: id,
        organizationId: session.organizationId!,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    
    // For local development - create uploads directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tasks", id);
    await mkdir(uploadDir, { recursive: true });

    // Save file locally
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    // Create file URL (for local development)
    const fileUrl = `/uploads/tasks/${id}/${uniqueFilename}`;

    // Save attachment record to database
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId: id,
        userId: session.userId,
        fileName: file.name,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      },
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
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.error("Failed to upload attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Attachment ID required" },
        { status: 400 }
      );
    }

    // Check if attachment exists and user has permission
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        task: {
          organizationId: session.organizationId!,
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Delete from database
    await prisma.taskAttachment.delete({
      where: {
        id: attachmentId,
      },
    });

    // For production, also delete the file from storage service
    // For local development, you could delete the file from the filesystem

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}