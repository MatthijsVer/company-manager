import { prisma } from "@/lib/db";

/**
 * Check and mark expired quotes
 * This function should be called periodically (e.g., via cron job)
 */
export async function processExpiredQuotes() {
  try {
    const now = new Date();
    
    // Find quotes that are SENT but past their validUntil date
    const expiredQuotes = await prisma.quote.findMany({
      where: {
        status: 'SENT',
        validUntil: {
          lt: now,
        },
      },
      select: {
        id: true,
        number: true,
        validUntil: true,
        organizationId: true,
      },
    });

    if (expiredQuotes.length === 0) {
      return { processed: 0, expired: [] };
    }

    // Update expired quotes to EXPIRED status
    const updateResult = await prisma.quote.updateMany({
      where: {
        id: {
          in: expiredQuotes.map(q => q.id),
        },
      },
      data: {
        status: 'EXPIRED',
        updatedAt: now,
      },
    });

    console.log(`Processed ${updateResult.count} expired quotes`);
    
    return {
      processed: updateResult.count,
      expired: expiredQuotes.map(q => ({
        id: q.id,
        number: q.number,
        validUntil: q.validUntil,
      })),
    };
  } catch (error) {
    console.error('Error processing expired quotes:', error);
    throw error;
  }
}

/**
 * Check if a quote is expired based on its validUntil date
 */
export function isQuoteExpired(validUntil: Date | null): boolean {
  if (!validUntil) return false;
  return new Date() > validUntil;
}

/**
 * Get quotes that will expire within the specified number of days
 */
export async function getQuotesExpiringIn(organizationId: string, days: number) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return prisma.quote.findMany({
    where: {
      organizationId,
      status: 'SENT',
      validUntil: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    select: {
      id: true,
      number: true,
      validUntil: true,
      total: true,
      currency: true,
    },
    orderBy: {
      validUntil: 'asc',
    },
  });
}