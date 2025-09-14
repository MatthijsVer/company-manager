import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/org-context'
import { createAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  customFields: z.record(z.string(), z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.null()
  ])).optional(),
})

// GET /api/companies
export async function GET(request: NextRequest) {
  try {
    const context = await requirePermission('company.view')
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'createdAt'
    
    const skip = (page - 1) * limit
    
    const where = {
      organizationId: context.organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ]
      })
    }
    
    // Determine sort order
    let orderBy: any = { createdAt: 'desc' }
    
    if (sort === 'recent') {
      // Sort by most recently updated or created
      orderBy = { updatedAt: 'desc' }
    } else if (sort === 'name') {
      orderBy = { name: 'asc' }
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' }
    }
    
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
        //   logo: true,
        //   color: true,
          status: true,
          email: true,
          phone: true,
          website: true,
          address: true,
          customFields: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.company.count({ where })
    ])
    
    return NextResponse.json({
      companies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
    
  } catch (error) {
    console.error('List companies error:', error)
    return NextResponse.json(
      { error: 'Failed to list companies' },
      { status: 500 }
    )
  }
}

// POST /api/companies
export async function POST(request: NextRequest) {
  try {
    const context = await requirePermission('company.create')
    const session = await getSession()
    
    const body = await request.json()
    const data = createCompanySchema.parse(body)
    
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    }
    
    // Validate custom fields against definitions
    let customFieldValues = {}
    if (data.customFields) {
      const fieldDefs = await prisma.customFieldDefinition.findMany({
        where: {
          organizationId: context.organizationId,
          entityType: 'company',
          isActive: true
        }
      })
      
      // Validate each custom field
      for (const fieldDef of fieldDefs) {
        const value = data.customFields[fieldDef.fieldKey]
        
        if (fieldDef.required && !value) {
          return NextResponse.json(
            { error: `${fieldDef.fieldLabel} is required` },
            { status: 400 }
          )
        }
        
        if (value !== undefined) {
          customFieldValues[fieldDef.fieldKey] = value
        }
      }
    }
    
    const company = await prisma.company.create({
      data: {
        organizationId: context.organizationId,
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        customFields: customFieldValues,
        createdBy: session?.userId,
        updatedBy: session?.userId,
      }
    })
    
    // Audit log
    await createAuditLog({
      action: 'create',
      entityType: 'company',
      entityId: company.id,
      entityName: company.name,
      changes: { after: company }
    })
    
    return NextResponse.json(company)
    
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}