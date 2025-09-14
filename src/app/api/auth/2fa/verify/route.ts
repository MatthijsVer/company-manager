import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTempSession, createSession, setSessionCookies, clearSession } from '@/lib/auth/session'
import { verifyTwoFactorCode } from '@/lib/auth/two-factor'

const verifySchema = z.object({
  code: z.string().length(6)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = verifySchema.parse(body)

    // Get temporary session
    const tempSession = await getTempSession()
    if (!tempSession) {
      return NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      )
    }

    // Verify code
    const isValid = await verifyTwoFactorCode(
      tempSession.userId,
      code,
      'LOGIN'
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    // Clear temporary session
    await clearSession()

    // Create full session
    const { accessToken, refreshToken } = await createSession(
      tempSession.userId,
      tempSession.organizationId,
      false // 2FA verified
    )
    
    await setSessionCookies(accessToken, refreshToken)

    return NextResponse.json({
      success: true,
      message: '2FA verification successful'
    })

  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    )
  }
}