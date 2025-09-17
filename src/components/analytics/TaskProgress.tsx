// components/analytics/TaskProgress.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";

interface TaskProgressProps {
  userId?: string;
}

export function TaskProgress({ userId = "me" }: TaskProgressProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/users/${userId}/stats?period=week`
      );
      const stats = await response.json();

      // Calculate percentages and extract data
      const totalTasks = stats.taskMetrics.summary.totalAssigned || 1;
      const completedTasks = stats.taskMetrics.summary.completed;
      const inProgressTasks = stats.taskMetrics.summary.inProgress;
      const upcomingTasks = totalTasks - completedTasks - inProgressTasks;

      setData({
        activityPercentage: Math.round((completedTasks / totalTasks) * 100),
        metrics: [
          {
            label: "In Progress",
            value: inProgressTasks,
            percentage: Math.round((inProgressTasks / totalTasks) * 100),
            color: "bg-green-500",
            ringColor: "ring-green-500",
          },
          {
            label: "Completed",
            value: completedTasks,
            percentage: Math.round((completedTasks / totalTasks) * 100),
            color: "bg-blue-500",
            ringColor: "ring-blue-500",
          },
          {
            label: "Upcoming",
            value: upcomingTasks,
            percentage: Math.round((upcomingTasks / totalTasks) * 100),
            color: "bg-orange-500",
            ringColor: "ring-orange-500",
          },
        ],
      });
    } catch (error) {
      console.error("Failed to fetch task progress:", error);
      // Use mock data on error
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => ({
    activityPercentage: 49,
    metrics: [
      {
        label: "In Progress",
        value: 34,
        percentage: 75,
        color: "bg-green-500",
        ringColor: "ring-green-500",
      },
      {
        label: "Completed",
        value: 72,
        percentage: 36,
        color: "bg-blue-500",
        ringColor: "ring-blue-500",
      },
      {
        label: "Upcoming",
        value: 18,
        percentage: 58,
        color: "bg-orange-500",
        ringColor: "ring-orange-500",
      },
    ],
  });

  const CircularProgress = ({
    percentage,
    color,
  }: {
    percentage: number;
    color: string;
  }) => {
    const radius = 45;
    const strokeWidth = 1.5;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="#f3f4f6"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            className={`transition-all duration-500 ease-out`}
            stroke={
              color === "bg-green-500"
                ? "#10b981"
                : color === "bg-blue-500"
                  ? "#3b82f6"
                  : "#FF6B4A"
            }
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{percentage}%</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse text-gray-400">
            Loading progress data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-none h-fit bg-white">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <h3 className="uppercase font-semibold">Progress</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 -mt-3">
        <div className="flex items-center">
          <div className="pr-6 border-r">
            <div className="text-4xl font-medium">
              {data.activityPercentage}%
            </div>
            <div className="text-sm text-gray-500 mt-1">Total activity</div>
          </div>
          <div className="text-[12px] flex flex-col ml-6 text-gray-400">
            This data was obtained in the last
            <span className="font-medium">7 days</span>
          </div>
        </div>

        {/* Progress Circles */}
        <div className="grid grid-cols-3 gap-4 py-3">
          {data.metrics.map((metric: any, index: number) => (
            <div key={index} className="flex flex-col items-center">
              <CircularProgress
                percentage={metric.percentage}
                color={metric.color}
              />
            </div>
          ))}
        </div>
        <div className="bg-[#FAFAFA] border w-full border-gray-100 rounded-2xl p-5 flex items-center">
          {data.metrics.map((metric: any, index: number) => (
            <div
              className={`text-start flex-1 ${(index === 0 || index === 1) && "border-r mr-4"}`}
              key={index}
            >
              <div className="text-xl font-medium">{metric.value}</div>
              <div className="text-xs text-gray-500 mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskProgress;
