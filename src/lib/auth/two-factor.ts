import { prisma } from '@/lib/db'
import { TwoFactorMethod, TwoFactorPurpose } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const CODE_LENGTH = parseInt(process.env.TWO_FACTOR_CODE_LENGTH || '6')
const CODE_EXPIRY = parseInt(process.env.TWO_FACTOR_CODE_EXPIRY || '600') // 10 minutes

export function generateNumericCode(length: number = CODE_LENGTH): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

export async function createTwoFactorToken(
  userId: string,
  purpose: TwoFactorPurpose
): Promise<{ token: string; code: string }> {
  // Clean up old tokens for this user and purpose
  await prisma.twoFactorToken.deleteMany({
    where: {
      userId,
      purpose,
      OR: [
        { expiresAt: { lt: new Date() } },
        { consumedAt: { not: null } }
      ]
    }
  })

  const code = generateNumericCode()
  const codeHash = await bcrypt.hash(code, 10)
  const token = nanoid(32)
  
  await prisma.twoFactorToken.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_EXPIRY * 1000)
    }
  })

  return { token, code }
}

export async function verifyTwoFactorCode(
  userId: string,
  code: string,
  purpose: TwoFactorPurpose
): Promise<boolean> {
  const tokens = await prisma.twoFactorToken.findMany({
    where: {
      userId,
      purpose,
      expiresAt: { gt: new Date() },
      consumedAt: null
    },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  if (tokens.length === 0) {
    return false
  }

  const token = tokens[0]
  const isValid = await bcrypt.compare(code, token.codeHash)

  if (isValid) {
    await prisma.twoFactorToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() }
    })
  }

  return isValid
}

export async function enableEmailTwoFactor(userId: string): Promise<{ code: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

  const { code } = await createTwoFactorToken(userId, 'ENABLE')

  return { code }
}

export async function confirmEnableTwoFactor(
  userId: string,
  code: string
): Promise<boolean> {
  const isValid = await verifyTwoFactorCode(userId, code, 'ENABLE')

  if (isValid) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: 'EMAIL',
        twoFactorEmailVerifiedAt: new Date()
      }
    })
  }

  return isValid
}

export async function disableTwoFactor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorEmailVerifiedAt: null,
      totpSecret: null
    }
  })

  // Clean up any pending tokens
  await prisma.twoFactorToken.deleteMany({
    where: { userId }
  })
}