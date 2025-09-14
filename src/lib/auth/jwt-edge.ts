
import { jwtVerify } from 'jose'
import type { JWTPayload } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET!

export async function verifyAccessTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as JWTPayload
  } catch (error) {
    console.error('Edge token verification error:', error)
    return null
  }
}