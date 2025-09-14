import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { sendInviteEmail } from '@/lib/auth/email'
import { OrgRole } from '@prisma/client'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole),
  organizationId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['OWNER', 'ADMIN', 'HR'])
    const body = await request.json()
    const { email, role, organizationId } = inviteSchema.parse(body)

    const targetOrgId = organizationId || session.organizationId
    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'Organization not specified' },
        { status: 400 }
      )
    }

    // Check permissions - only owners can invite admins/owners
    if ((role === 'OWNER' || role === 'ADMIN') && session.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign this role' },
        { status: 403 }
      )
    }

    // Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: { organizationId: targetOrgId }
        }
      }
    })

    if (existingUser?.memberships.length) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      )
    }

    // Check for pending invites
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId: targetOrgId,
        status: 'PENDING'
      }
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Get inviter details
    const inviter = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: targetOrgId }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create invite
    const token = nanoid(32)
    const invite = await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        organizationId: targetOrgId,
        role,
        token,
        inviterId: session.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Send email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite/${token}`
    await sendInviteEmail(
      email,
      inviter?.name || inviter?.email || 'Someone',
      organization.name,
      inviteUrl,
      role
    )

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role
      }
    })

  } catch (error) {
    console.error('Send invite error:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}