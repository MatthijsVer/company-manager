import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth/org-context'

const customFieldSchema = z.object({
  entityType: z.string(),
  fieldKey: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  fieldLabel: z.string(),
  fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'textarea']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  displayOrder: z.number().optional(),
})

// GET /api/custom-fields
export async function GET(request: NextRequest) {
  try {
    const context = await requirePermission('settings.view')
    
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') || 'company'
    
    const fields = await prisma.customFieldDefinition.findMany({
      where: {
        organizationId: context.organizationId,
        entityType,
        isActive: true
      },
      orderBy: { displayOrder: 'asc' }
    })
    
    return NextResponse.json(fields)
    
  } catch (error) {
    console.error('List custom fields error:', error)
    return NextResponse.json(
      { error: 'Failed to list custom fields' },
      { status: 500 }
    )
  }
}

// POST /api/custom-fields
export async function POST(request: NextRequest) {
  try {
    const context = await requirePermission('settings.update')
    
    const body = await request.json()
    const data = customFieldSchema.parse(body)
    
    // Check if field key already exists
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        organizationId_entityType_fieldKey: {
          organizationId: context.organizationId,
          entityType: data.entityType,
          fieldKey: data.fieldKey
        }
      }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Field key already exists' },
        { status: 400 }
      )
    }
    
    const field = await prisma.customFieldDefinition.create({
      data: {
        organizationId: context.organizationId,
        ...data
      }
    })
    
    return NextResponse.json(field)
    
  } catch (error) {
    console.error('Create custom field error:', error)
    return NextResponse.json(
      { error: 'Failed to create custom field' },
      { status: 500 }
    )
  }
}