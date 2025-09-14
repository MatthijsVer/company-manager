import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, userId } = await params
      
      const body = await request.json()
  
      // Verify assignment exists
      const existingAssignment = await prisma.companyAssignment.findFirst({
        where: {
          companyId: id,
          userId: userId,
          company: {
            organizationId: context.organizationId,
          },
        },
      })
  
      if (!existingAssignment) {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        )
      }
  
      // If setting as primary, unset other primary assignments
      if (body.isPrimary && !existingAssignment.isPrimary) {
        await prisma.companyAssignment.updateMany({
          where: {
            companyId: id,
            isPrimary: true,
            userId: { not: userId },
          },
          data: { isPrimary: false },
        })
      }
  
      // Update assignment
      const assignment = await prisma.companyAssignment.update({
        where: {
          companyId_userId: {
            companyId: id,
            userId: userId,
          },
        },
        data: body,
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
  
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'assignment_updated',
          description: `Updated assignment for ${assignment.user.name}`,
          metadata: {
            assignedUserId: userId,
            changes: body,
          }
        }
      })
  
      return NextResponse.json(assignment)
    } catch (error) {
      console.error('Update assignment error:', error)
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      )
    }
  }
  
  // DELETE /api/companies/[id]/assignments/[userId]
  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, userId } = await params
  
      const assignment = await prisma.companyAssignment.findFirst({
        where: {
          companyId: id,
          userId: userId,
          company: {
            organizationId: context.organizationId,
          },
        },
        include: {
          user: {
            select: { name: true },
          },
        },
      })
  
      if (!assignment) {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        )
      }
  
      await prisma.companyAssignment.delete({
        where: {
          companyId_userId: {
            companyId: id,
            userId: userId,
          },
        },
      })
  
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'user_unassigned',
          description: `Removed ${assignment.user.name} from company`,
          metadata: {
            unassignedUserId: userId,
            unassignedUserName: assignment.user.name,
          }
        }
      })
  
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Delete assignment error:', error)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }
  }