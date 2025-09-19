import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const session = await requireAuth();
      const { id } = params;
      const { companyIds } = await req.json();
  
      if (!companyIds || !Array.isArray(companyIds)) {
        return NextResponse.json(
          { error: "Company IDs array is required" },
          { status: 400 }
        );
      }
  
      // Check folder permissions
      const permission = await prisma.folderPermission.findFirst({
        where: {
          folderId: id,
          userId: session.userId,
          canShare: true,
        },
      });
  
      if (!permission) {
        return NextResponse.json(
          { error: "You don't have permission to share this folder" },
          { status: 403 }
        );
      }
  
      // Verify companies exist
      const companies = await prisma.company.findMany({
        where: {
          id: { in: companyIds },
          organizationId: session.organizationId,
        },
      });
  
      if (companies.length !== companyIds.length) {
        return NextResponse.json(
          { error: "One or more companies not found" },
          { status: 404 }
        );
      }
  
      // Get existing links
      const existingLinks = await prisma.folderCompanyLink.findMany({
        where: {
          folderId: id,
          companyId: { in: companyIds },
        },
      });
  
      const existingCompanyIds = existingLinks.map(link => link.companyId);
      const newCompanyIds = companyIds.filter(id => !existingCompanyIds.includes(id));
  
      // Create new links
      if (newCompanyIds.length > 0) {
        await prisma.folderCompanyLink.createMany({
          data: newCompanyIds.map(companyId => ({
            folderId: id,
            companyId,
            linkedBy: session.userId,
          })),
        });
      }
  
      return NextResponse.json({ 
        success: true,
        linkedCount: newCompanyIds.length,
      });
    } catch (error) {
      console.error("Failed to link folder to companies:", error);
      return NextResponse.json(
        { error: "Failed to link folder to companies" },
        { status: 500 }
      );
    }
  }