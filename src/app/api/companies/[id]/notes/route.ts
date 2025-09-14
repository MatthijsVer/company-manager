import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

const createNoteSchema = z.object({
    content: z.string().min(1),
    category: z.string().optional().nullable(),
  })
  
  // GET /api/companies/[id]/notes
  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const context = await requirePermission('company.view')
      const { id } = await params
      
      const notes = await prisma.companyNote.findMany({
        where: {
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
      })
      
      return NextResponse.json(notes)
    } catch (error) {
      console.error('List notes error:', error)
      return NextResponse.json(
        { error: 'Failed to list notes' },
        { status: 500 }
      )
    }
  }
  
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id } = await params
      
      const body = await request.json()
      const data = createNoteSchema.parse(body)
      
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
      
      const note = await prisma.companyNote.create({
        data: {
          ...data,
          companyId: id,
          userId: session?.userId!,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })
      
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'note_added',
          description: `Added a ${data.category || 'general'} note`,
          metadata: { 
            noteId: note.id,
            category: data.category,
            preview: data.content.substring(0, 100)
          }
        }
      })
      
      return NextResponse.json(note)
    } catch (error) {
      console.error('Create note error:', error)
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }
  }