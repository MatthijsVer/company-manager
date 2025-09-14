import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

const createContactSchema = z.object({
    name: z.string().min(1).max(255),
    title: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    isPrimary: z.boolean().default(false),
  })
  
  // GET /api/companies/[id]/contacts
  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const context = await requirePermission('company.view')
      const { id } = await params
      
      const contacts = await prisma.companyContact.findMany({
        where: {
          companyId: id,
          company: {
            organizationId: context.organizationId,
          },
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' },
        ],
      })
      
      return NextResponse.json(contacts)
    } catch (error) {
      console.error('List contacts error:', error)
      return NextResponse.json(
        { error: 'Failed to list contacts' },
        { status: 500 }
      )
    }
  }
  
  // POST /api/companies/[id]/contacts
  export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const context = await requirePermission('company.update')
      const session = await getSession()
      const { id } = await params
      
      const body = await request.json()
      const data = createContactSchema.parse(body)
      
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
      
      // If setting as primary, unset other primary contacts
      if (data.isPrimary) {
        await prisma.companyContact.updateMany({
          where: {
            companyId: id,
            isPrimary: true,
          },
          data: { isPrimary: false },
        })
      }
      
      const contact = await prisma.companyContact.create({
        data: {
          ...data,
          companyId: id,
        },
      })
      
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'contact_added',
          description: `Added contact ${data.name}`,
          metadata: { contactName: data.name, contactId: contact.id }
        }
      })
      
      return NextResponse.json(contact)
    } catch (error) {
      console.error('Create contact error:', error)
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      )
    }
  }