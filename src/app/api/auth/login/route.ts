import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { createTwoFactorToken } from '@/lib/auth/two-factor'
import { sendTwoFactorCode } from '@/lib/auth/email'
import { setActiveOrgId } from '@/lib/auth/org-context'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationSlug: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, organizationSlug } = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: { organization: true }
        }
      }
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Determine organization
    let organizationId: string | undefined
    
    if (organizationSlug) {
      const membership = user.memberships.find(
        m => m.organization.slug === organizationSlug
      )
      if (!membership) {
        return NextResponse.json(
          { error: 'You are not a member of this organization' },
          { status: 403 }
        )
      }
      organizationId = membership.organizationId
    } else if (user.memberships.length === 1) {
      organizationId = user.memberships[0].organizationId
    } else if (user.memberships.length > 1) {
      // Return available organizations for selection
      return NextResponse.json({
        requiresOrgSelection: true,
        organizations: user.memberships.map(m => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role
        }))
      })
    } else {
      return NextResponse.json(
        { error: 'You are not a member of any organization' },
        { status: 403 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      const { code } = await createTwoFactorToken(user.id, 'LOGIN')
      await sendTwoFactorCode(user.email, code)

      // Create temporary session
      const { accessToken } = await createSession(
        user.id,
        organizationId,
        true // twoFactorRequired
      )
      
      // Create response with 2FA required
      const response = NextResponse.json({
        requires2FA: true,
        message: 'Verification code sent to your email'
      })

      // Set temporary session cookie
      response.cookies.set('temp_session', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10 // 10 minutes
      })

      return response
    }

    // Create full session
    const { accessToken, refreshToken } = await createSession(
      user.id,
      organizationId,
      false
    )
    
    await setActiveOrgId(organizationId!)
    
    const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || `${user.firstName} ${user.lastName}`.trim()
        }
      })

    // Set cookies directly on the response
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15 // 15 minutes
    })

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    response.cookies.set('activeOrgId', organizationId!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/'
      })

    console.log('Login successful, cookies set for user:', user.email)

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}