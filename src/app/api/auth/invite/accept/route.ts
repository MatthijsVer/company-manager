import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password'
import { createSession, setSessionCookies } from '@/lib/auth/session'

const acceptInviteSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, firstName, lastName } = acceptInviteSchema.parse(body)

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', errors: passwordValidation.errors },
        { status: 400 }
      )
    }

    // Find invite
    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { organization: true }
    })

    if (!invite || invite.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 400 }
      )
    }

    // Check expiry
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invite.email }
    })

    const passwordHash = await hashPassword(password)

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          passwordHash,
          status: 'ACTIVE',
          emailVerified: new Date()
        }
      })
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: invite.email.toLowerCase(),
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          passwordHash,
          status: 'ACTIVE',
          emailVerified: new Date()
        }
      })
    }

    // Create membership
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
        isDefault: true
      }
    })

    // Update invite
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        inviteeId: user.id
      }
    })

    // Create session
    const { accessToken, refreshToken } = await createSession(
      user.id,
      invite.organizationId
    )
    
    await setSessionCookies(accessToken, refreshToken)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      organization: {
        id: invite.organization.id,
        name: invite.organization.name,
        slug: invite.organization.slug
      }
    })

  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}