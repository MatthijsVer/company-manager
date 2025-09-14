import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const context = await requirePermission('company.import')
    const session = await getSession()
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    const text = await file.text()
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    // Get custom field definitions
    const customFieldDefs = await prisma.customFieldDefinition.findMany({
      where: {
        organizationId: context.organizationId,
        entityType: 'company',
        isActive: true
      }
    })
    
    for (const [index, record] of records.entries()) {
      try {
        // Map CSV columns to company fields
        const companyData: any = {
          organizationId: context.organizationId,
          name: record.name || record.Name || record.company || record.Company,
          email: record.email || record.Email,
          phone: record.phone || record.Phone,
          website: record.website || record.Website,
          createdBy: session?.userId,
          updatedBy: session?.userId,
        }
        
        // Handle address fields
        if (record.street || record.city || record.country) {
          companyData.address = {
            street: record.street,
            city: record.city,
            state: record.state,
            country: record.country,
            postalCode: record.postalCode || record.postal_code
          }
        }
        
        // Handle custom fields
        const customFields: any = {}
        for (const fieldDef of customFieldDefs) {
          const value = record[fieldDef.fieldKey] || record[fieldDef.fieldLabel]
          if (value !== undefined) {
            customFields[fieldDef.fieldKey] = value
          }
        }
        
        if (Object.keys(customFields).length > 0) {
          companyData.customFields = customFields
        }
        
        // Generate slug
        companyData.slug = companyData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        
        await prisma.company.create({ data: companyData })
        results.success++
        
      } catch (error) {
        results.failed++
        results.errors.push(`Row ${index + 2}: ${error.message}`)
      }
    }
    
    // Audit log
    await createAuditLog({
      action: 'import',
      entityType: 'company',
      entityId: 'batch',
      metadata: {
        totalRecords: records.length,
        success: results.success,
        failed: results.failed
      }
    })
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Import companies error:', error)
    return NextResponse.json(
      { error: 'Failed to import companies' },
      { status: 500 }
    )
  }
}