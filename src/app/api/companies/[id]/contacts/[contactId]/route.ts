import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; contactId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, contactId } = await params
      
      const body = await request.json()
      
      const existingContact = await prisma.companyContact.findFirst({
        where: {
          id: contactId,
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
      })
      
      if (!existingContact) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        )
      }
      
      // If setting as primary, unset other primary contacts
      if (body.isPrimary && !existingContact.isPrimary) {
        await prisma.companyContact.updateMany({
          where: {
            companyId: id,
            isPrimary: true,
            id: { not: contactId },
          },
          data: { isPrimary: false },
        })
      }
      
      const contact = await prisma.companyContact.update({
        where: { id: contactId },
        data: body,
      })
      
      // Create activity if significant changes
      if (body.lastContactAt) {
        await prisma.companyActivity.create({
          data: {
            companyId: id,
            userId: session?.userId!,
            type: 'contact_updated',
            description: `Logged contact with ${contact.name}`,
            metadata: { contactId: contact.id, contactName: contact.name }
          }
        })
      }
      
      return NextResponse.json(contact)
    } catch (error) {
      console.error('Update contact error:', error)
      return NextResponse.json(
        { error: 'Failed to update contact' },
        { status: 500 }
      )
    }
  }
  
  // DELETE /api/companies/[id]/contacts/[contactId]
  export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; contactId: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id, contactId } = await params
      
      const contact = await prisma.companyContact.findFirst({
        where: {
          id: contactId,
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
      })
      
      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        )
      }
      
      await prisma.companyContact.delete({
        where: { id: contactId },
      })
      
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'contact_deleted',
          description: `Deleted contact ${contact.name}`,
          metadata: { contactName: contact.name }
        }
      })
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Delete contact error:', error)
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      )
    }
  }