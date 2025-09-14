import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

const assignmentSchema = z.object({
  userId: z.string(),
  role: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  permissions: z.object({
    canEdit: z.boolean().default(false),
    canDelete: z.boolean().default(false),
    canManageTeam: z.boolean().default(false),
  }).optional(),
  notes: z.string().optional().nullable(),
})

// GET /api/companies/[id]/assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requirePermission('company.view')
    const { id } = await params

    const assignments = await prisma.companyAssignment.findMany({
      where: {
        companyId: id,
        company: {
          organizationId: context.organizationId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { assignedAt: 'desc' },
      ],
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('List assignments error:', error)
    return NextResponse.json(
      { error: 'Failed to list assignments' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/assignments
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requirePermission('company.update')
    const session = await getSession()
    const { id } = await params
    
    const body = await request.json()
    const data = assignmentSchema.parse(body)

    // Verify company exists and belongs to org
    const company = await prisma.company.findFirst({
      where: {
        id,
        organizationId: context.organizationId,
      },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if user is already assigned
    const existingAssignment = await prisma.companyAssignment.findUnique({
      where: {
        companyId_userId: {
          companyId: id,
          userId: data.userId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this company' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primary assignments
    if (data.isPrimary) {
      await prisma.companyAssignment.updateMany({
        where: {
          companyId: id,
          isPrimary: true,
        },
        data: { isPrimary: false },
      })
    }

    // Create assignment
    const assignment = await prisma.companyAssignment.create({
      data: {
        companyId: id,
        userId: data.userId,
        role: data.role,
        isPrimary: data.isPrimary,
        permissions: data.permissions,
        notes: data.notes,
        assignedBy: session?.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
          },
        },
      },
    })

    // Get user details for activity log
    const assignedUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { name: true },
    })

    // Create activity
    await prisma.companyActivity.create({
      data: {
        companyId: id,
        userId: session?.userId!,
        type: 'user_assigned',
        description: `Assigned ${assignedUser?.name || 'user'} to company${data.role ? ` as ${data.role}` : ''}`,
        metadata: {
          assignedUserId: data.userId,
          assignedUserName: assignedUser?.name,
          role: data.role,
          isPrimary: data.isPrimary,
        }
      }
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Create assignment error:', error)
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}