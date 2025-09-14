import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const context = await requirePermission('company.view')
      const { id } = await params
      
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const type = searchParams.get('type')
      
      const skip = (page - 1) * limit
      
      const where = {
        companyId: id,
        company: {
          organizationId: context.organizationId,
        },
        ...(type && { type }),
      }
      
      const [activities, total] = await Promise.all([
        prisma.companyActivity.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.companyActivity.count({ where }),
      ])
      
      return NextResponse.json({
        activities,
        hasMore: skip + activities.length < total,
        total,
      })
    } catch (error) {
      console.error('List activities error:', error)
      return NextResponse.json(
        { error: 'Failed to list activities' },
        { status: 500 }
      )
    }
  }
  