import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { sendInvitationEmail } from '@/lib/auth/email';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const invites = await prisma.invite.findMany({
      where: {
        organizationId: session.organizationId,
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(invites);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { email, role } = body;

    // Check if user has permission to invite
    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        organizationId: session.organizationId,
        role: { in: ['OWNER', 'ADMIN', 'PROJECT_MANAGER'] }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if user already exists in organization
    const existingMember = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        memberships: {
          some: {
            organizationId: session.organizationId
          }
        }
      }
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId: session.organizationId,
        status: 'PENDING'
      }
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      );
    }

    // Create invite
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await prisma.invite.create({
      data: {
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        organizationId: session.organizationId,
        inviterId: session.userId,
        status: 'PENDING'
      },
      include: {
        organization: true,
        inviter: true
      }
    });

    // Send invitation email
    await sendInvitationEmail({
      to: email,
      inviterName: invite.inviter?.name || 'A team member',
      organizationName: invite.organization.name,
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`,
      role
    });

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}