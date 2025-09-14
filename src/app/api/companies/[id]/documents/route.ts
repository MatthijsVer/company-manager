// app/api/companies/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/org-context'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { nanoid } from 'nanoid'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requirePermission('company.view')
    const { id } = await params
    
    // Get company-specific documents
    const companyDocuments = await prisma.companyDocument.findMany({
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
      orderBy: { createdAt: 'desc' },
    })
    
    // Get organization documents linked to this company
    const linkedOrgDocuments = await prisma.documentCompanyLink.findMany({
      where: {
        companyId: id,
        document: {
          organizationId: context.organizationId,
        },
      },
      include: {
        document: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
    
    // Transform and combine both types of documents
    const allDocuments = [
      // Company-specific documents
      ...companyDocuments.map(doc => ({
        ...doc,
        source: 'company' as const,
        isOrganizationDoc: false,
      })),
      // Organization documents linked to this company
      ...linkedOrgDocuments.map(link => ({
        id: link.document.id,
        companyId: id,
        uploadedBy: link.document.uploadedBy,
        fileName: link.document.fileName,
        fileUrl: link.document.fileUrl,
        fileSize: link.document.fileSize,
        mimeType: link.document.mimeType,
        category: link.document.category,
        description: link.document.description,
        metadata: {
          ...link.document.metadata,
          linkedAt: link.linkedAt,
          linkedBy: link.user,
        },
        user: link.document.user,
        createdAt: link.document.createdAt,
        updatedAt: link.document.updatedAt,
        source: 'organization' as const,
        isOrganizationDoc: true,
        isTemplate: link.document.isTemplate,
        isStarred: link.document.isStarred,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return NextResponse.json(allDocuments)
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// POST /api/companies/[id]/documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requirePermission('company.update')
    const session = await getSession()
    const { id } = await params
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string
    const description = formData.get('description') as string
    const linkToOrganization = formData.get('linkToOrganization') === 'true'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Verify company exists
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
    
    // Save file to disk (in production, use cloud storage)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'companies', id)
    await mkdir(uploadDir, { recursive: true })
    
    const uniqueFilename = `${nanoid()}_${file.name}`
    const filepath = join(uploadDir, uniqueFilename)
    await writeFile(filepath, buffer)
    
    const fileUrl = `/uploads/companies/${id}/${uniqueFilename}`
    
    let document;
    
    if (linkToOrganization) {
      // Create as organization document and link to this company
      const orgDocument = await prisma.organizationDocument.create({
        data: {
          organizationId: context.organizationId,
          uploadedBy: session?.userId!,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          category: category || 'uncategorized',
          description,
          companies: {
            create: {
              companyId: id,
              linkedBy: session?.userId!,
            },
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
          companies: {
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      })
      
      document = {
        ...orgDocument,
        source: 'organization',
        isOrganizationDoc: true,
      }
    } else {
      // Create as company-specific document
      document = await prisma.companyDocument.create({
        data: {
          companyId: id,
          uploadedBy: session?.userId!,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          category: category || 'uncategorized',
          description,
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
      
      document = {
        ...document,
        source: 'company',
        isOrganizationDoc: false,
      }
    }
    
    // Create activity
    await prisma.companyActivity.create({
      data: {
        companyId: id,
        userId: session?.userId!,
        type: 'document_uploaded',
        description: `Uploaded document ${file.name}${linkToOrganization ? ' (organization-wide)' : ''}`,
        metadata: { 
          documentId: document.id,
          fileName: file.name,
          category,
          isOrganizationDoc: linkToOrganization,
        }
      }
    })
    
    return NextResponse.json(document)
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

// app/api/companies/[id]/documents/[documentId]/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const context = await requirePermission('company.update')
    const session = await getSession()
    const { id, documentId } = await params
    
    // Check if it's a company document
    const companyDocument = await prisma.companyDocument.findFirst({
      where: {
        id: documentId,
        companyId: id,
        company: {
          organizationId: context.organizationId,
        },
      },
    })
    
    if (companyDocument) {
      // Delete company-specific document
      await prisma.companyDocument.delete({
        where: { id: documentId },
      })
      
      // Delete file from disk (implement in production)
      // await deleteFile(companyDocument.fileUrl)
      
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'document_deleted',
          description: `Deleted document ${companyDocument.fileName}`,
          metadata: { fileName: companyDocument.fileName }
        }
      })
      
      return NextResponse.json({ success: true })
    }
    
    // Check if it's an organization document link
    const documentLink = await prisma.documentCompanyLink.findFirst({
      where: {
        documentId,
        companyId: id,
        document: {
          organizationId: context.organizationId,
        },
      },
      include: {
        document: true,
      },
    })
    
    if (documentLink) {
      // Only unlink from company, don't delete the actual document
      await prisma.documentCompanyLink.delete({
        where: {
          documentId_companyId: {
            documentId,
            companyId: id,
          },
        },
      })
      
      // Create activity
      await prisma.companyActivity.create({
        data: {
          companyId: id,
          userId: session?.userId!,
          type: 'document_unlinked',
          description: `Unlinked organization document ${documentLink.document.fileName}`,
          metadata: { fileName: documentLink.document.fileName }
        }
      })
      
      return NextResponse.json({ success: true, action: 'unlinked' })
    }
    
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
