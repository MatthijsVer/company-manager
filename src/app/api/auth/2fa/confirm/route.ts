import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/session'
import { confirmEnableTwoFactor } from '@/lib/auth/two-factor'

const confirmSchema = z.object({
  code: z.string().length(6)
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const { code } = confirmSchema.parse(body)

    const success = await confirmEnableTwoFactor(session.userId, code)

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully'
    })

  } catch (error) {
    console.error('Confirm 2FA error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm 2FA setup' },
      { status: 500 }
    )
  }
}