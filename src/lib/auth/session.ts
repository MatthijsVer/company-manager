import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { AuthSession, SafeUser, UserWithMemberships } from '@/types/auth'
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from './jwt'
import { OrgRole } from '@prisma/client'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'
const TEMP_SESSION_COOKIE = 'temp_session' // For 2FA flow

export async function createSession(
  userId: string,
  organizationId?: string,
  twoFactorRequired: boolean = false
): Promise<{ accessToken: string; refreshToken: string; session: AuthSession }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: organizationId ? { organizationId } : { isDefault: true },
        include: { organization: true }
      }
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const membership = user.memberships[0]
  
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`
  
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    organizationId: membership?.organizationId,
    role: membership?.role,
    twoFactorVerified: !twoFactorRequired,
    sessionId
  }

  // Create session in database
  await prisma.session.create({
    data: {
      sessionToken: sessionId,
      userId: user.id,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }
  })

  const accessToken = generateAccessToken(session)
  const refreshToken = generateRefreshToken(user.id)

  // Update last login
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  })

  return { accessToken, refreshToken, session }
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
  temporary: boolean = false
): Promise<void> {
  const cookieStore = await cookies()

  if (temporary) {
    // For 2FA flow - short-lived cookie
    cookieStore.set(TEMP_SESSION_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })
  } else {
    // Regular session cookies
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15 // 15 minutes
    })

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!accessToken) {
    return null
  }

  const payload = verifyAccessToken(accessToken)
  if (!payload) {
    return null
  }

  return {
    userId: payload.userId,
    email: payload.email,
    organizationId: payload.organizationId,
    role: payload.role,
    twoFactorVerified: payload.twoFactorVerified,
    sessionId: payload.sessionId
  }
}

export async function getTempSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const tempToken = cookieStore.get(TEMP_SESSION_COOKIE)?.value

  if (!tempToken) {
    return null
  }

  const payload = verifyAccessToken(tempToken)
  if (!payload) {
    return null
  }

  return {
    userId: payload.userId,
    email: payload.email,
    organizationId: payload.organizationId,
    role: payload.role,
    twoFactorVerified: false,
    sessionId: payload.sessionId
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
  cookieStore.delete(TEMP_SESSION_COOKIE)
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()
  
  if (!session || !session.twoFactorVerified) {
    throw new Error('Unauthorized')
  }

  return session
}

export async function requireRole(allowedRoles: OrgRole[]): Promise<AuthSession> {
  const session = await requireAuth()
  
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new Error('Insufficient permissions')
  }

  return session
}

export async function getCurrentUser(): Promise<UserWithMemberships | null> {
  const session = await getSession()
  
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      name: true,
      firstName: true,
      lastName: true,
      image: true,
      phone: true,
      locale: true,
      timezone: true,
      status: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      twoFactorEmailVerifiedAt: true,
      preferences: true,
      lastLoginAt: true,
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        include: {
          organization: true
        }
      }
    }
  })

  return user as UserWithMemberships
}