import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, isAfter, differenceInDays, differenceInHours } from "date-fns";
import { cache, CACHE_TTL, CACHE_KEYS } from "@/lib/cache";

// Query params schema
const querySchema = z.object({
  period: z.enum(["day", "week", "month", "quarter", "year"]).optional().default("month"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeTeamComparison: z
    .union([
      z.boolean(),
      z.string().transform((val) => val === "true"),
    ])
    .optional()
    .default(false),
});

// Types
interface BillabilityTrend {
  date: string;
  billableHours: number;
  nonBillableHours: number;
  utilizationRate: number;
}

interface CompanyBillability {
  companyId: string;
  companyName: string;
  billableHours: number;
  nonBillableHours: number;
  totalRevenue?: number; // If you have hourly rates
}

interface TaskPriorityBreakdown {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  URGENT: number;
}

interface TaskStatusBreakdown {
  TODO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  COMPLETED: number;
  ARCHIVED: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Auth check using your custom session
    const session = await requireAuth();
    
    if (!session?.organizationId) {
      return NextResponse.json({ error: "No organization selected" }, { status: 401 });
    }

    const { userId } = await params;
    
    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.parse(searchParams);
    
    // Determine date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);
    
    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      switch (query.period) {
        case "day":
          startDate = startOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now);
          break;
        case "quarter":
          startDate = startOfMonth(subMonths(now, 2));
          break;
        case "year":
          startDate = startOfMonth(subMonths(now, 11));
          break;
        case "month":
        default:
          startDate = startOfMonth(now);
      }
    }

    // Handle "me" as userId for current user
    const targetUserId = userId === 'me' ? session.userId : userId;

    // Verify user belongs to organization
    const userMembership = await prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        organizationId: session.organizationId,
      },
    });

    if (!userMembership) {
      return NextResponse.json({ error: "User not found in organization" }, { status: 404 });
    }

    // Check permissions - users can view their own stats, 
    // but need appropriate role to view others
    if (targetUserId !== session.userId) {
      const viewerMembership = await prisma.membership.findFirst({
        where: {
          userId: session.userId,
          organizationId: session.organizationId,
        },
      });

      const allowedRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'HR'];
      if (!viewerMembership || !allowedRoles.includes(viewerMembership.role)) {
        return NextResponse.json({ error: "Insufficient permissions to view other users' stats" }, { status: 403 });
      }
    }

    // Parallel queries for better performance
    const [
      timeEntries,
      tasks,
      currentTimeEntry,
      userDetails,
      teamStats
    ] = await Promise.all([
      // Get all time entries for the period
      prisma.timeEntry.findMany({
        where: {
          userId: targetUserId,
          startTime: { gte: startDate, lte: endDate },
        },
        include: {
          company: { select: { id: true, name: true } },
          task: { select: { id: true, name: true, status: true } },
        },
      }),
      
      // Get all tasks
      prisma.task.findMany({
        where: {
          assignedToId: targetUserId,
          organizationId: session.organizationId,
        },
        include: {
          company: { select: { id: true, name: true } },
          comments: { select: { id: true, createdAt: true } },
          timeEntries: { select: { duration: true } },
        },
      }),
      
      // Get current running timer
      prisma.timeEntry.findFirst({
        where: {
          userId: targetUserId,
          isRunning: true,
        },
        include: {
          task: true,
          company: true,
        },
      }),
      
      // Get user details
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          name: true,
          email: true,
          image: true,
        },
      }),
      
      // Get team averages if requested
      query.includeTeamComparison
        ? prisma.timeEntry.groupBy({
            by: ["userId"],
            where: {
              startTime: { gte: startDate, lte: endDate },
              user: {
                memberships: {
                  some: { organizationId: session.organizationId },
                },
              },
            },
            _sum: { duration: true },
          })
        : null,
    ]);

    // Calculate billability metrics
    const billabilityMetrics = calculateBillability(timeEntries, startDate, endDate);
    
    // Calculate task metrics
    const taskMetrics = calculateTaskMetrics(tasks, startDate, endDate);
    
    // Calculate productivity metrics
    const productivityMetrics = calculateProductivity(timeEntries, tasks, currentTimeEntry);
    
    // Calculate performance score
    const performanceScore = calculatePerformanceScore(
      billabilityMetrics,
      taskMetrics,
      productivityMetrics,
      teamStats,
      targetUserId
    );

    // Build response
    const stats = {
      user: userDetails,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: query.period,
      },
      billability: billabilityMetrics,
      taskMetrics,
      productivity: productivityMetrics,
      performanceScore,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid query parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch user statistics" }, { status: 500 });
  }
}

// Helper Functions

function calculateBillability(
  timeEntries: any[],
  startDate: Date,
  endDate: Date
) {
  const billableHours = timeEntries
    .filter(entry => entry.isBillable)
    .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const nonBillableHours = timeEntries
    .filter(entry => !entry.isBillable)
    .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const internalHours = timeEntries
    .filter(entry => entry.isInternal)
    .reduce((sum, entry) => sum + entry.duration, 0) / 3600;

  const totalHours = billableHours + nonBillableHours;
  const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  // Group by company
  const byCompany = timeEntries.reduce((acc, entry) => {
    if (!entry.company) return acc;
    
    const key = entry.company.id;
    if (!acc[key]) {
      acc[key] = {
        companyId: entry.company.id,
        companyName: entry.company.name,
        billableHours: 0,
        nonBillableHours: 0,
      };
    }
    
    const hours = entry.duration / 3600;
    if (entry.isBillable) {
      acc[key].billableHours += hours;
    } else {
      acc[key].nonBillableHours += hours;
    }
    
    return acc;
  }, {} as Record<string, CompanyBillability>);

  // Calculate trends (simplified - you might want more granular data)
  const trends = calculateBillabilityTrends(timeEntries, startDate, endDate);

  return {
    currentPeriod: {
      billableHours: parseFloat(billableHours.toFixed(2)),
      nonBillableHours: parseFloat(nonBillableHours.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      utilizationRate: parseFloat(utilizationRate.toFixed(1)),
      internalHours: parseFloat(internalHours.toFixed(2)),
    },
    trends,
    byCompany: Object.values(byCompany).map(company => ({
      ...company,
      billableHours: parseFloat(company.billableHours.toFixed(2)),
      nonBillableHours: parseFloat(company.nonBillableHours.toFixed(2)),
    })),
  };
}

function calculateBillabilityTrends(
  timeEntries: any[],
  startDate: Date,
  endDate: Date
): { daily: BillabilityTrend[]; weekly: BillabilityTrend[]; monthly: BillabilityTrend[] } {
  // Group entries by day
  const dailyMap = new Map<string, { billable: number; nonBillable: number }>();
  
  timeEntries.forEach(entry => {
    const dateKey = startOfDay(entry.startTime).toISOString().split('T')[0];
    const current = dailyMap.get(dateKey) || { billable: 0, nonBillable: 0 };
    
    const hours = entry.duration / 3600;
    if (entry.isBillable) {
      current.billable += hours;
    } else {
      current.nonBillable += hours;
    }
    
    dailyMap.set(dateKey, current);
  });

  // Convert to array format
  const daily: BillabilityTrend[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      billableHours: parseFloat(data.billable.toFixed(2)),
      nonBillableHours: parseFloat(data.nonBillable.toFixed(2)),
      utilizationRate: data.billable + data.nonBillable > 0
        ? parseFloat(((data.billable / (data.billable + data.nonBillable)) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Aggregate weekly and monthly from daily data
  const weekly = aggregateTrends(daily, 'week');
  const monthly = aggregateTrends(daily, 'month');

  return { daily, weekly, monthly };
}

function aggregateTrends(daily: BillabilityTrend[], period: 'week' | 'month'): BillabilityTrend[] {
  const aggregated = new Map<string, { billable: number; nonBillable: number; days: number }>();
  
  daily.forEach(day => {
    const date = new Date(day.date);
    const key = period === 'week'
      ? `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const current = aggregated.get(key) || { billable: 0, nonBillable: 0, days: 0 };
    current.billable += day.billableHours;
    current.nonBillable += day.nonBillableHours;
    current.days += 1;
    aggregated.set(key, current);
  });

  return Array.from(aggregated.entries()).map(([date, data]) => ({
    date,
    billableHours: parseFloat(data.billable.toFixed(2)),
    nonBillableHours: parseFloat(data.nonBillable.toFixed(2)),
    utilizationRate: data.billable + data.nonBillable > 0
      ? parseFloat(((data.billable / (data.billable + data.nonBillable)) * 100).toFixed(1))
      : 0,
  }));
}

function calculateTaskMetrics(tasks: any[], startDate: Date, endDate: Date) {
  const totalAssigned = tasks.length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter(t => 
    t.dueDate && 
    isAfter(new Date(), new Date(t.dueDate)) && 
    t.status !== 'COMPLETED'
  ).length;

  // Tasks completed within period
  const completedInPeriod = tasks.filter(t => 
    t.completedAt && 
    t.completedAt >= startDate && 
    t.completedAt <= endDate
  );

  const onTimeDelivery = completedInPeriod.filter(t =>
    !t.dueDate || t.completedAt <= t.dueDate
  ).length;

  // Priority breakdown
  const byPriority: TaskPriorityBreakdown = {
    LOW: tasks.filter(t => t.priority === 'LOW').length,
    MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
    HIGH: tasks.filter(t => t.priority === 'HIGH').length,
    URGENT: tasks.filter(t => t.priority === 'URGENT').length,
  };

  // Status breakdown
  const byStatus: TaskStatusBreakdown = {
    TODO: tasks.filter(t => t.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    REVIEW: tasks.filter(t => t.status === 'REVIEW').length,
    COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
    ARCHIVED: tasks.filter(t => t.status === 'ARCHIVED').length,
  };

  // Velocity calculation
  const daysDiff = Math.max(1, differenceInDays(endDate, startDate));
  const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7));
  const dailyVelocity = completedInPeriod.length / daysDiff;
  const weeklyVelocity = completedInPeriod.length / weeksDiff;

  // Estimation accuracy
  const tasksWithEstimates = completedInPeriod.filter(t => t.estimatedHours);
  const estimationStats = tasksWithEstimates.reduce((acc, task) => {
    const actualHours = task.timeEntries.reduce((sum: number, entry: any) => 
      sum + (entry.duration / 3600), 0
    );
    const variance = actualHours - (task.estimatedHours || 0);
    const percentVariance = task.estimatedHours ? 
      Math.abs(variance / task.estimatedHours) : 0;

    if (percentVariance <= 0.1) {
      acc.accurate++;
    } else if (variance > 0) {
      acc.underestimated++;
    } else {
      acc.overestimated++;
    }

    acc.totalVariance += Math.abs(variance);
    acc.count++;
    return acc;
  }, { accurate: 0, overestimated: 0, underestimated: 0, totalVariance: 0, count: 0 });

  return {
    summary: {
      totalAssigned,
      completed,
      inProgress,
      overdue,
      completionRate: totalAssigned > 0 ? 
        parseFloat(((completed / totalAssigned) * 100).toFixed(1)) : 0,
      onTimeDeliveryRate: completedInPeriod.length > 0 ?
        parseFloat(((onTimeDelivery / completedInPeriod.length) * 100).toFixed(1)) : 0,
    },
    byPriority,
    byStatus,
    velocity: {
      daily: parseFloat(dailyVelocity.toFixed(2)),
      weekly: parseFloat(weeklyVelocity.toFixed(2)),
      trend: calculateVelocityTrend(tasks, startDate, endDate),
    },
    estimationAccuracy: {
      averageVariance: estimationStats.count > 0 ?
        parseFloat((estimationStats.totalVariance / estimationStats.count).toFixed(2)) : 0,
      overestimated: estimationStats.overestimated,
      underestimated: estimationStats.underestimated,
      accurate: estimationStats.accurate,
    },
  };
}

function calculateVelocityTrend(
  tasks: any[],
  startDate: Date,
  endDate: Date
): 'increasing' | 'stable' | 'decreasing' {
  // Compare first half vs second half of period
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
  
  const firstHalf = tasks.filter(t =>
    t.completedAt && t.completedAt >= startDate && t.completedAt < midPoint
  ).length;
  
  const secondHalf = tasks.filter(t =>
    t.completedAt && t.completedAt >= midPoint && t.completedAt <= endDate
  ).length;

  const difference = secondHalf - firstHalf;
  const threshold = Math.max(1, (firstHalf + secondHalf) * 0.1); // 10% threshold

  if (difference > threshold) return 'increasing';
  if (difference < -threshold) return 'decreasing';
  return 'stable';
}

function calculateProductivity(
  timeEntries: any[],
  tasks: any[],
  currentTimeEntry: any
) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  // Today's entries
  const todayEntries = timeEntries.filter(entry =>
    entry.startTime >= todayStart && entry.startTime <= todayEnd
  );

  const todayHours = todayEntries.reduce((sum, entry) =>
    sum + (entry.duration / 3600), 0
  );

  const todayBillable = todayEntries
    .filter(entry => entry.isBillable)
    .reduce((sum, entry) => sum + (entry.duration / 3600), 0);

  const todayCompleted = tasks.filter(t =>
    t.completedAt && t.completedAt >= todayStart && t.completedAt <= todayEnd
  ).length;

  // Calculate averages
  const uniqueDays = new Set(
    timeEntries.map(entry =>
      startOfDay(entry.startTime).toISOString().split('T')[0]
    )
  ).size;

  const totalHours = timeEntries.reduce((sum, entry) =>
    sum + (entry.duration / 3600), 0
  );

  // Average task completion time by priority
  const taskCompletionTime: Record<string, number> = {};
  ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].forEach(priority => {
    const priorityTasks = tasks.filter(t =>
      t.priority === priority && t.completedAt && t.createdAt
    );
    
    if (priorityTasks.length > 0) {
      const avgHours = priorityTasks.reduce((sum, task) => {
        const hours = differenceInHours(task.completedAt, task.createdAt);
        return sum + hours;
      }, 0) / priorityTasks.length;
      
      taskCompletionTime[priority] = parseFloat(avgHours.toFixed(2));
    } else {
      taskCompletionTime[priority] = 0;
    }
  });

  // Response time (time to first comment)
  const tasksWithComments = tasks.filter(t => t.comments.length > 0);
  const avgResponseTime = tasksWithComments.length > 0
    ? tasksWithComments.reduce((sum, task) => {
        const firstComment = task.comments.sort((a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        return sum + differenceInHours(firstComment.createdAt, task.createdAt);
      }, 0) / tasksWithComments.length
    : 0;

  return {
    activeTimeEntry: currentTimeEntry,
    todayStats: {
      hoursLogged: parseFloat(todayHours.toFixed(2)),
      tasksCompleted: todayCompleted,
      billablePercentage: todayHours > 0
        ? parseFloat(((todayBillable / todayHours) * 100).toFixed(1))
        : 0,
    },
    averages: {
      dailyHours: uniqueDays > 0
        ? parseFloat((totalHours / uniqueDays).toFixed(2))
        : 0,
      taskCompletionTime,
      responseTime: parseFloat(avgResponseTime.toFixed(2)),
    },
  };
}

function calculatePerformanceScore(
  billability: any,
  taskMetrics: any,
  productivity: any,
  teamStats: any,
  userId: string
) {
  // Calculate component scores (0-100 scale)
  const billabilityScore = Math.min(100, billability.currentPeriod.utilizationRate * 1.2);
  const taskCompletionScore = taskMetrics.summary.completionRate;
  const onTimeDeliveryScore = taskMetrics.summary.onTimeDeliveryRate;
  
  // Collaboration score based on comments and response time
  const collaborationScore = Math.min(100,
    productivity.averages.responseTime > 0
      ? (24 / productivity.averages.responseTime) * 100
      : 50
  );

  // Weighted average
  const overall = (
    billabilityScore * 0.35 +
    taskCompletionScore * 0.25 +
    onTimeDeliveryScore * 0.25 +
    collaborationScore * 0.15
  );

  // Team ranking if available
  let ranking = { position: 0, totalUsers: 0, percentile: 0 };
  if (teamStats) {
    const sorted = teamStats.sort((a: any, b: any) =>
      (b._sum.duration || 0) - (a._sum.duration || 0)
    );
    const position = sorted.findIndex((s: any) => s.userId === userId) + 1;
    const totalUsers = sorted.length;
    
    ranking = {
      position,
      totalUsers,
      percentile: totalUsers > 0
        ? parseFloat((((totalUsers - position + 1) / totalUsers) * 100).toFixed(1))
        : 0,
    };
  }

  return {
    overall: parseFloat(overall.toFixed(1)),
    components: {
      billability: parseFloat(billabilityScore.toFixed(1)),
      taskCompletion: parseFloat(taskCompletionScore.toFixed(1)),
      onTimeDelivery: parseFloat(onTimeDeliveryScore.toFixed(1)),
      collaboration: parseFloat(collaborationScore.toFixed(1)),
    },
    ranking,
  };
}