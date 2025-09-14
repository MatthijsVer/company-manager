import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/session'
import { enableEmailTwoFactor } from '@/lib/auth/two-factor'
import { sendTwoFactorCode } from '@/lib/auth/email'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()

    const { code } = await enableEmailTwoFactor(session.userId)
    await sendTwoFactorCode(session.email, code)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    })

  } catch (error) {
    console.error('Enable 2FA error:', error)
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
}