import jwt from 'jsonwebtoken'
import { AuthSession, JWTPayload } from '@/types/auth'
import { nanoid } from 'nanoid'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

export function generateAccessToken(session: AuthSession): string {
  return jwt.sign(session, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, tokenId: nanoid() },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  )
}

export function verifyAccessToken(token: string): JWTPayload | null {
    try {
      console.log('Verifying token with JWT_SECRET exists:', !!JWT_SECRET)
      console.log('JWT_SECRET length:', JWT_SECRET?.length)
      
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
      console.log('Token verified successfully:', payload.email)
      return payload
    } catch (error) {
      console.error('Token verification error:', error.message)
      console.error('Error name:', error.name)
      return null
    }
  }

export function verifyRefreshToken(token: string): { userId: string; tokenId: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; tokenId: string }
  } catch {
    return null
  }
}

export function generateSessionId(): string {
  return nanoid(32)
}