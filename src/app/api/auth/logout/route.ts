import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    // Get the current session to find the session token
    const session = await getSession()
    
    if (session && session.sessionId) {
      // Delete the session from database
      await prisma.session.deleteMany({
        where: {
          sessionToken: session.sessionId
        }
      })
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear all auth cookies
    const cookieStore = await cookies()
    
    // Delete access token
    response.cookies.delete('access_token')
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    // Delete refresh token
    response.cookies.delete('refresh_token')
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    // Delete temp session if exists
    response.cookies.delete('temp_session')
    response.cookies.set('temp_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    // Even if there's an error, clear the cookies
    const response = NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
    
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    response.cookies.delete('temp_session')
    
    return response
  }
}