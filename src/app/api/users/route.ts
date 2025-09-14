import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Check if user has permission to view users
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

    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId: session.organizationId
          }
        }
      },
      include: {
        memberships: {
          where: {
            organizationId: session.organizationId
          }
        }
      }
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName} ${user.lastName}`.trim(),
      image: user.image,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      role: user.memberships[0]?.role || 'MEMBER',
      createdAt: user.createdAt
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}