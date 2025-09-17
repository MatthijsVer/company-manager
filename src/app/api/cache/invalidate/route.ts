// app/api/cache/invalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { cache, CACHE_KEYS } from "@/lib/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const invalidateSchema = z.object({
  type: z.enum(["user", "organization", "all", "pattern"]).optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  pattern: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    if (!session?.organizationId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 401 });
    }

    const body = await request.json();
    const params = invalidateSchema.parse(body);

    let invalidatedCount = 0;

    switch (params.type) {
      case "user":
        // Invalidate caches for a specific user
        const userId = params.userId || session.userId;
        await cache.invalidateUserCaches(userId, session.organizationId);
        console.log(`Invalidated cache for user: ${userId}`);
        break;

      case "organization":
        // Invalidate all caches for the organization
        const orgId = params.organizationId || session.organizationId;
        const patterns = [
          `${CACHE_KEYS.DAILY_TASKS}:${orgId}:*`,
          `${CACHE_KEYS.USER_STATS}:${orgId}:*`,
          `${CACHE_KEYS.BOARDS}:${orgId}:*`,
          `${CACHE_KEYS.TIME_ENTRIES}:${orgId}:*`,
          `${CACHE_KEYS.COMPANIES}:${orgId}:*`,
        ];
        
        for (const pattern of patterns) {
          invalidatedCount += await cache.invalidatePattern(pattern);
        }
        console.log(`Invalidated ${invalidatedCount} cache keys for organization: ${orgId}`);
        break;

      case "pattern":
        // Invalidate caches matching a specific pattern
        if (!params.pattern) {
          return NextResponse.json({ error: "Pattern required" }, { status: 400 });
        }
        invalidatedCount = await cache.invalidatePattern(params.pattern);
        console.log(`Invalidated ${invalidatedCount} cache keys matching pattern: ${params.pattern}`);
        break;

      case "all":
        // Clear all caches (admin only)
        const membership = await prisma.membership.findFirst({
          where: {
            userId: session.userId,
            organizationId: session.organizationId,
          },
        });

        if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
          return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        await cache.flush();
        console.log("Flushed all cache");
        break;

      default:
        // Default: invalidate current user's caches
        await cache.invalidateUserCaches(session.userId, session.organizationId);
        console.log(`Invalidated cache for current user: ${session.userId}`);
    }

    return NextResponse.json({
      success: true,
      invalidatedCount,
      cacheStatus: cache.getStatus(),
    });
  } catch (error) {
    console.error("Error invalidating cache:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to invalidate cache" }, { status: 500 });
  }
}

// GET endpoint to check cache status
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const status = cache.getStatus();
    
    // Get cache keys count (if Redis)
    let keyCount = 0;
    try {
      if (status.type === "redis") {
        // This is a safe operation that won't affect performance
        const keys = await cache.invalidatePattern("*dry-run*"); // Pattern that won't match anything
        keyCount = 0; // We don't actually want to count all keys in production
      }
    } catch (error) {
      // Ignore errors
    }

    return NextResponse.json({
      ...status,
      keyCount,
      userId: session.userId,
      organizationId: session.organizationId,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get cache status" }, { status: 500 });
  }
}