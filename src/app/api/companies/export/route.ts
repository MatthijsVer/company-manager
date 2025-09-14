import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const context = await requirePermission('company.export')
    
    const companies = await prisma.company.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' }
    })

    // Convert to CSV
    const headers = ['name', 'email', 'phone', 'website', 'street', 'city', 'state', 'country', 'postalCode']
    const csvRows = [headers.join(',')]

    for (const company of companies) {
      const row = [
        company.name,
        company.email || '',
        company.phone || '',
        company.website || '',
        company.address?.street || '',
        company.address?.city || '',
        company.address?.state || '',
        company.address?.country || '',
        company.address?.postalCode || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`)
      
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\n')

    // Audit log
    await createAuditLog({
      action: 'export',
      entityType: 'company',
      entityId: 'batch',
      metadata: { count: companies.length }
    })

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="companies-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Export companies error:', error)
    return NextResponse.json(
      { error: 'Failed to export companies' },
      { status: 500 }
    )
  }
}