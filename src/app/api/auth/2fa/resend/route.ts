import { NextRequest, NextResponse } from 'next/server'
import { getTempSession } from '@/lib/auth/session'
import { createTwoFactorToken } from '@/lib/auth/two-factor'
import { sendTwoFactorCode } from '@/lib/auth/email'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get temporary session
    const tempSession = await getTempSession()
    
    if (!tempSession) {
      return NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      )
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: tempSession.userId },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate new code
    const { code } = await createTwoFactorToken(tempSession.userId, 'LOGIN')
    
    // Send email
    await sendTwoFactorCode(user.email, code)

    return NextResponse.json({
      success: true,
      message: 'Verification code resent to your email'
    })

  } catch (error) {
    console.error('Resend 2FA code error:', error)
    return NextResponse.json(
      { error: 'Failed to resend code' },
      { status: 500 }
    )
  }
}