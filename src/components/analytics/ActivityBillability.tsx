// components/analytics/ActivityBillability.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface ActivityBillabilityProps {
  userId?: string;
}

export function ActivityBillability({
  userId = "me",
}: ActivityBillabilityProps) {
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [userId, period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/users/${userId}/stats?period=${period === "weekly" ? "week" : "month"}`
      );
      const stats = await response.json();

      // Transform data for the chart
      const chartData = generateChartData(stats);
      setData({
        totalHours: stats.billability.currentPeriod.totalHours,
        chartData,
        byPlatform:
          stats.billability.byCompany?.slice(0, 4).map((company: any) => ({
            name: company.companyName,
            hours: company.billableHours + company.nonBillableHours,
            lessons: Math.floor(
              (company.billableHours + company.nonBillableHours) / 2
            ), // Mock lesson count
          })) || generateMockPlatforms(),
      });
    } catch (error) {
      console.error("Failed to fetch activity data:", error);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (stats: any) => {
    if (!stats?.billability?.trends?.daily) return getMockChartData();

    const days = ["S", "M", "T", "W", "T", "F", "S"];
    const thisWeek = stats.billability.trends.daily.slice(-7);
    const lastWeek = stats.billability.trends.daily.slice(-14, -7);

    return days.map((day, index) => ({
      day,
      thisWeek:
        thisWeek[index]?.billableHours + thisWeek[index]?.nonBillableHours || 0,
      lastWeek:
        lastWeek[index]?.billableHours + lastWeek[index]?.nonBillableHours || 0,
    }));
  };

  const getMockData = () => ({
    totalHours: 834.6,
    chartData: getMockChartData(),
    byPlatform: generateMockPlatforms(),
  });

  const getMockChartData = () => [
    { day: "S", thisWeek: 65, lastWeek: 45 },
    { day: "M", thisWeek: 82, lastWeek: 70 },
    { day: "T", thisWeek: 75, lastWeek: 85 },
    { day: "W", thisWeek: 95, lastWeek: 78 },
    { day: "T", thisWeek: 82, lastWeek: 90 },
    { day: "F", thisWeek: 70, lastWeek: 65 },
    { day: "S", thisWeek: 60, lastWeek: 50 },
  ];

  const generateMockPlatforms = () => [
    { name: "Artistic Algorithms", hours: 46.3, lessons: 16 },
    { name: "Cirno Creations", hours: 27.9, lessons: 23 },
    { name: "Futuristic Pixelworks", hours: 31.7, lessons: 9 },
    { name: "Visionaries Painters", hours: 19.4, lessons: 15 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].value;
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{total.toFixed(1)} Hours</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="h-full col-span-2 border-0 rounded-3xl">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse text-gray-400">
            Loading activity data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-3xl border-none bg-white">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <h3 className="uppercase font-semibold">Activity</h3>
          <Select
            value={period}
            onValueChange={(value: any) => setPeriod(value)}
          >
            <SelectTrigger className="bg-gray-100 border text-xs rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 -mt-3 px-0">
        {/* Total Hours */}
        <div className="flex items-center px-6">
          <div className="pr-6 border-r">
            <div className="text-4xl font-medium">
              {data.totalHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Hours Spent</div>
          </div>
          <div className="text-[12px] flex flex-col ml-6 text-gray-400">
            This data was obtained in the last
            <span className="font-medium">
              {period === "monthly" ? 30 : 7} days
            </span>
          </div>
        </div>

        {/* Area Chart */}
        <div className="h-38 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.chartData}
              margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="thisWeekGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#FF6B4A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF6B4A" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="lastWeekGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="thisWeek"
                stroke="#FF6B4A"
                strokeWidth={1}
                fill="url(#thisWeekGradient)"
              />
              <Area
                type="monotone"
                dataKey="lastWeek"
                stroke="#fbbf24"
                strokeWidth={1}
                fill="url(#lastWeekGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-6 px-6 text-xs -mt-2 mb-8">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#FF6B4A]"></div>
            <span className="text-gray-600">This Week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-yellow-400"></div>
            <span className="text-gray-600">Last Week</span>
          </div>
        </div>

        {/* By Platform */}
        <div className="px-6">
          <div className="space-y-4 bg-[#FAFAFA] border-gray-100 rounded-xl p-4 border">
            <h4 className="font-medium text-sm uppercase">By Project</h4>
            <div className="space-y-3">
              {data.byPlatform.map((platform: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex gap-3 w-full">
                    <Avatar className="size-10 min-w-10">
                      <AvatarImage className="object-cover" src="" />
                      <AvatarFallback className="bg-[#1F1F1F] text-white text-sm">
                        {platform.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`w-full relative pb-3 ${index !== data.byPlatform.length - 1 && "border-b"}`}
                    >
                      <div className="font-medium text-sm">{platform.name}</div>
                      <div className="text-xs text-gray-500">
                        {platform.lessons} lessons
                      </div>
                      <div className="text-sm font-medium absolute top-1/2 right-3 -translate-y-1/2">
                        {platform.hours.toFixed(1)} h
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ActivityBillability;
