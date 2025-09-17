// types/analytics.ts

export interface UserStats {
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
    period: {
      start: string;
      end: string;
      label: string;
    };
    billability: {
      currentPeriod: {
        billableHours: number;
        nonBillableHours: number;
        totalHours: number;
        utilizationRate: number;
        internalHours: number;
      };
      trends: {
        daily: BillabilityTrend[];
        weekly: BillabilityTrend[];
        monthly: BillabilityTrend[];
      };
      byCompany: CompanyBillability[];
    };
    taskMetrics: {
      summary: {
        totalAssigned: number;
        completed: number;
        inProgress: number;
        overdue: number;
        completionRate: number;
        onTimeDeliveryRate: number;
      };
      byPriority: TaskPriorityBreakdown;
      byStatus: TaskStatusBreakdown;
      velocity: {
        daily: number;
        weekly: number;
        trend: 'increasing' | 'stable' | 'decreasing';
      };
      estimationAccuracy: {
        averageVariance: number;
        overestimated: number;
        underestimated: number;
        accurate: number;
      };
    };
    productivity: {
      activeTimeEntry: TimeEntry | null;
      todayStats: {
        hoursLogged: number;
        tasksCompleted: number;
        billablePercentage: number;
      };
      averages: {
        dailyHours: number;
        taskCompletionTime: Record<string, number>;
        responseTime: number;
      };
    };
    performanceScore: {
      overall: number;
      components: {
        billability: number;
        taskCompletion: number;
        onTimeDelivery: number;
        collaboration: number;
      };
      ranking: {
        position: number;
        totalUsers: number;
        percentile: number;
      };
    };
  }
  
  export interface BillabilityTrend {
    date: string;
    billableHours: number;
    nonBillableHours: number;
    utilizationRate: number;
  }
  
  export interface CompanyBillability {
    companyId: string;
    companyName: string;
    billableHours: number;
    nonBillableHours: number;
    totalRevenue?: number;
  }
  
  export interface TaskPriorityBreakdown {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  }
  
  export interface TaskStatusBreakdown {
    TODO: number;
    IN_PROGRESS: number;
    REVIEW: number;
    COMPLETED: number;
    ARCHIVED: number;
  }
  
  export interface TimeEntry {
    id: string;
    description: string;
    startTime: string;
    endTime: string | null;
    duration: number;
    isRunning: boolean;
    isBillable: boolean;
    task?: {
      id: string;
      name: string;
      status: string;
    };
    company?: {
      id: string;
      name: string;
    };
  }
  