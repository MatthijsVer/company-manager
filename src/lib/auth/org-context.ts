import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { OrgRole } from '@prisma/client'
import { getSession } from './session'

const ACTIVE_ORG_COOKIE = 'activeOrgId'

export interface OrgContext {
  organizationId: string
  organization: {
    id: string
    name: string
    slug: string
  }
  membership: {
    id: string
    role: OrgRole
    title?: string | null
  }
  permissions: Set<string>
}

// Permission mappings
export const ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  OWNER: ['*'], // All permissions
  ADMIN: [
    'company.*',
    'invoice.*',
    'user.invite',
    'user.view',
    'user.update',
    'settings.view',
    'settings.update',
  ],
  PROJECT_MANAGER: [
    'company.view',
    'company.create',
    'company.update',
    'invoice.view',
    'invoice.create',
    'invoice.update',
  ],
  HR: [
    'company.view',
    'user.view',
    'user.invite',
  ],
  FINANCE: [
    'company.view',
    'invoice.*',
  ],
  MEMBER: [
    'company.view',
    'invoice.view',
  ],
  CONTRACTOR: [
    'company.view',
  ],
  CLIENT: [
    'company.view',
  ],
}

export function expandPermissions(permissions: string[]): Set<string> {
  const expanded = new Set<string>()
  
  for (const perm of permissions) {
    if (perm === '*') {
      // Superuser - all permissions
      expanded.add('*')
      return expanded
    }
    
    if (perm.endsWith('.*')) {
      // Wildcard - expand to all actions for this resource
      const resource = perm.slice(0, -2)
      const actions = ['view', 'create', 'update', 'delete', 'export', 'import']
      actions.forEach(action => expanded.add(`${resource}.${action}`))
    } else {
      expanded.add(perm)
    }
  }
  
  return expanded
}

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_ORG_COOKIE)?.value || null
}

export async function setActiveOrgId(organizationId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/'
  })
}

export async function clearActiveOrgId(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_ORG_COOKIE)
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const session = await getSession()
  if (!session || !session.twoFactorVerified) {
    return null
  }

  // Get active org from cookie or session
  let organizationId = await getActiveOrgId()
  
  if (!organizationId) {
    organizationId = session.organizationId || null
  }
  
  if (!organizationId) {
    // No org context available
    return null
  }

  // Fetch membership and org details
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId
      }
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  })

  if (!membership) {
    // User is not a member of this org
    await clearActiveOrgId()
    return null
  }

  // Build permissions set
  const rolePermissions = ROLE_PERMISSIONS[membership.role] || []
  const permissions = expandPermissions(rolePermissions)

  return {
    organizationId,
    organization: membership.organization,
    membership: {
      id: membership.id,
      role: membership.role,
      title: membership.title
    },
    permissions
  }
}

export async function requireOrgContext(): Promise<OrgContext> {
  const context = await getOrgContext()
  if (!context) {
    throw new Error('No organization context')
  }
  return context
}

export async function requirePermission(permission: string): Promise<OrgContext> {
  const context = await requireOrgContext()
  
  if (!hasPermission(context, permission)) {
    throw new Error('Insufficient permissions')
  }
  
  return context
}

export function hasPermission(context: OrgContext, permission: string): boolean {
  if (context.permissions.has('*')) {
    return true // Superuser
  }
  
  if (context.permissions.has(permission)) {
    return true
  }
  
  // Check for wildcard permissions
  const [resource, action] = permission.split('.')
  if (context.permissions.has(`${resource}.*`)) {
    return true
  }
  
  return false
}

export async function switchOrganization(organizationId: string): Promise<boolean> {
  const session = await getSession()
  if (!session) {
    return false
  }

  // Verify user is a member of the target org
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.userId,
        organizationId
      }
    }
  })

  if (!membership) {
    return false
  }

  await setActiveOrgId(organizationId)
  return true
}