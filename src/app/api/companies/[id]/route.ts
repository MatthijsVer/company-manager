import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/org-context'
import { createAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  annualRevenue: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'PENDING']).optional(),
  type: z.enum(['PROSPECT', 'CLIENT', 'PARTNER', 'VENDOR', 'PAST_CLIENT']).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
  tags: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional(),
})

// GET /api/companies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requirePermission('company.view')
    
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: context.organizationId,
      },
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(company)
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { error: 'Failed to get company' },
      { status: 500 }
    )
  }
}

// PATCH /api/companies/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requirePermission('company.update')
    const session = await getSession()
    
    const body = await request.json()
    const data = updateCompanySchema.parse(body)
    
    // Get existing company for audit log
    const existing = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: context.organizationId,
      },
    })
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    // Validate custom fields if provided
    if (data.customFields) {
      const fieldDefs = await prisma.customFieldDefinition.findMany({
        where: {
          organizationId: context.organizationId,
          entityType: 'company',
          isActive: true
        }
      })
      
      for (const fieldDef of fieldDefs) {
        const value = data.customFields[fieldDef.fieldKey]
        
        if (fieldDef.required && !value) {
          return NextResponse.json(
            { error: `${fieldDef.fieldLabel} is required` },
            { status: 400 }
          )
        }
      }
    }
    
    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...data,
        updatedBy: session?.userId,
      },
    })
    
    // Create audit log
    await createAuditLog({
      action: 'update',
      entityType: 'company',
      entityId: company.id,
      entityName: company.name,
      changes: { before: existing, after: company }
    })
    
    // Create activity
    if (data.status && data.status !== existing.status) {
      await prisma.companyActivity.create({
        data: {
          companyId: company.id,
          userId: session?.userId!,
          type: 'status_changed',
          description: `Status changed from ${existing.status} to ${data.status}`,
          metadata: { oldStatus: existing.status, newStatus: data.status }
        }
      })
    }
    
    return NextResponse.json(company)
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}

// DELETE /api/companies/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requirePermission('company.delete')
    
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        organizationId: context.organizationId,
      },
    })
    
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }
    
    await prisma.company.delete({
      where: { id: params.id },
    })
    
    // Audit log
    await createAuditLog({
      action: 'delete',
      entityType: 'company',
      entityId: company.id,
      entityName: company.name,
      changes: { before: company }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    )
  }
}