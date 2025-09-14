import { User, Organization, Membership, OrgRole } from '@prisma/client'

export type SafeUser = Omit<User, 'passwordHash' | 'totpSecret' | 'backupCodes'>

export interface AuthSession {
  userId: string
  email: string
  organizationId?: string
  role?: OrgRole
  twoFactorVerified: boolean
  sessionId: string
}

export interface JWTPayload extends AuthSession {
  iat: number
  exp: number
}

export interface LoginCredentials {
  email: string
  password: string
  organizationSlug?: string
}

export interface InviteAcceptData {
  token: string
  password: string
  firstName: string
  lastName: string
}

export interface TwoFactorVerifyData {
  code: string
  sessionToken: string
}

export interface UserWithMemberships extends SafeUser {
  memberships: (Membership & {
    organization: Organization
  })[]
}