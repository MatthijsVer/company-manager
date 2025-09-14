import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { isStarred } = body;

    const document = await prisma.organizationDocument.update({
      where: {
        id: params.id,
        organizationId: session.organizationId!,
      },
      data: { isStarred },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        companies: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const transformedDocument = {
      ...document,
      companies: document.companies.map(link => link.company),
      tags: document.tags ? JSON.parse(document.tags) : [],
    };

    return NextResponse.json(transformedDocument);
  } catch (error) {
    console.error("Failed to update star status:", error);
    return NextResponse.json(
      { error: "Failed to update star status" },
      { status: 500 }
    );
  }
}