import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; noteId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, noteId } = await params
      
      const body = await request.json()
      
      // Verify note exists and user has permission
      const existingNote = await prisma.companyNote.findFirst({
        where: {
          id: noteId,
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
      })
      
      if (!existingNote) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        )
      }
      
      // Only allow user who created the note or admins to edit
      if (existingNote.userId !== session?.userId && context.role !== 'ADMIN' && context.role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Unauthorized to edit this note' },
          { status: 403 }
        )
      }
      
      const note = await prisma.companyNote.update({
        where: { id: noteId },
        data: {
          content: body.content,
          isPinned: body.isPinned ?? existingNote.isPinned,
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
      
      return NextResponse.json(note)
    } catch (error) {
      console.error('Update note error:', error)
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      )
    }
  }
  
  // DELETE /api/companies/[id]/notes/[noteId]
  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; noteId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, noteId } = await params
      
      const note = await prisma.companyNote.findFirst({
        where: {
          id: noteId,
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
      })
      
      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        )
      }
      
      // Only allow user who created the note or admins to delete
      if (note.userId !== session?.userId && context.role !== 'ADMIN' && context.role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Unauthorized to delete this note' },
          { status: 403 }
        )
      }
      
      await prisma.companyNote.delete({
        where: { id: noteId },
      })
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Delete note error:', error)
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      )
    }
  }