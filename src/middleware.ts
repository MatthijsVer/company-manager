// src/middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessTokenEdge } from '@/lib/auth/jwt-edge' // Use edge-compatible version

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip static files
  const isStaticFile = pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf)$/i)
  if (isStaticFile) {
    return NextResponse.next()
  }

  // Public paths
  const publicPaths = [
    '/auth/login',
    '/auth/invite',
    '/auth/verify-2fa',
    '/api/auth/login',
    '/api/auth/invite',
    '/api/auth/2fa/verify',
    '/api/auth/2fa/resend'
  ]

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Check for access token
  const accessToken = request.cookies.get('access_token')?.value
  
  if (!accessToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Verify token with edge-compatible function
  const payload = await verifyAccessTokenEdge(accessToken) // Note: this is now async
  
  if (!payload) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check if 2FA is required
  if (!payload.twoFactorVerified && pathname !== '/auth/verify-2fa') {
    return NextResponse.redirect(new URL('/auth/verify-2fa', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)',
  ],
}