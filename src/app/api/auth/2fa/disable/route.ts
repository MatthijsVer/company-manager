import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { disableTwoFactor } from '@/lib/auth/two-factor'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    await disableTwoFactor(session.userId)

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully'
    })

  } catch (error) {
    console.error('Disable 2FA error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
