import { prisma } from '@/lib/db'
import { getOrgContext } from '@/lib/auth/org-context'
import { getSession } from '@/lib/auth/session'

interface AuditLogData {
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import'
  entityType: string
  entityId: string
  entityName?: string
  changes?: {
    before?: any
    after?: any
  }
  metadata?: Record<string, any>
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const session = await getSession()
    const context = await getOrgContext()
    
    if (!session || !context) {
      console.error('Cannot create audit log without session/context')
      return
    }

    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        userId: session.userId,
        userEmail: session.email,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        changes: data.changes,
        metadata: {
          ...data.metadata,
          timestamp: new Date().toISOString(),
        }
      }
    })
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error('Audit log error:', error)
  }
}

// Helper for tracking changes
export function trackChanges<T extends Record<string, any>>(
  before: T,
  after: T,
  fieldsToTrack?: string[]
): { before: any; after: any } | null {
  const changes: { before: any; after: any } = {
    before: {},
    after: {}
  }
  
  const fields = fieldsToTrack || Object.keys({ ...before, ...after })
  let hasChanges = false
  
  for (const field of fields) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changes.before[field] = before[field]
      changes.after[field] = after[field]
      hasChanges = true
    }
  }
  
  return hasChanges ? changes : null
}