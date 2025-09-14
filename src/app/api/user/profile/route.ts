import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, requireAuth } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user profile data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.image || '',
      phone: user.phone,
      locale: user.locale,
      timezone: user.timezone,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod,
      preferences: user.preferences,
      memberships: user.memberships.map(m => ({
        id: m.id,
        role: m.role,
        title: m.title,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug
        }
      }))
    })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}