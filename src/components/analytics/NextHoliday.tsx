// components/analytics/NextHoliday.tsx
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
import { Calendar, Sun, Plane, Home } from "lucide-react";

interface NextHolidayProps {
  userId?: string;
}

export function NextHoliday({ userId = "me" }: NextHolidayProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // In production, this would call your actual API
      // const response = await fetch(`/api/users/${userId}/holidays?view=${viewType}`);
      // const holidays = await response.json();

      // Mock data for now
      setData(getMockData());
    } catch (error) {
      console.error("Failed to fetch holiday data:", error);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => ({
    daysUntil: 23,
    holidayName: "Summer Vacation",
    startDate: "July 15, 2025",
    endDate: "July 29, 2025",
    duration: 14,
    type: "vacation", // vacation, public, personal
    upcomingHolidays: [
      { name: "Autumn Break", days: 67, duration: 5, type: "vacation" },
      { name: "Christmas Holiday", days: 102, duration: 10, type: "public" },
      { name: "Personal Day", days: 45, duration: 1, type: "personal" },
      { name: "Winter Vacation", days: 156, duration: 7, type: "vacation" },
    ],
  });

  const getHolidayIcon = (type: string) => {
    switch (type) {
      case "vacation":
        return <Plane className="size-4" />;
      case "public":
        return <Calendar className="size-4" />;
      case "personal":
        return <Home className="size-4" />;
      default:
        return <Sun className="size-4" />;
    }
  };

  const getHolidayColor = (type: string) => {
    switch (type) {
      case "vacation":
        return "text-[#FF6B4A]";
      case "public":
        return "text-orange-500";
      case "personal":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse text-gray-400">
            Loading holiday data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit col-span-2 rounded-3xl border-none bg-white">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <h3 className="uppercase font-semibold">Next Holiday</h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 -mt-2">
        {/* Days Until */}
        <div className="flex items-center">
          <div className="pr-6 border-r">
            <div className="text-4xl font-medium">{data.daysUntil}</div>
            <div className="text-sm text-gray-500 mt-1">Days Away</div>
          </div>
          <div className="text-[12px] flex flex-col ml-6 text-gray-400">
            Your next scheduled holiday
            <span className="font-medium">{data.holidayName}</span>
          </div>
        </div>

        {/* Holiday Details Card */}
        <div className="bg-[#FF6B4A]/10 rounded-xl p-4 border border-[#FF6B4A] mt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={getHolidayColor(data.type)}>
                  {getHolidayIcon(data.type)}
                </div>
                <h4 className="font-semibold text-sm">{data.holidayName}</h4>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>
                  {data.startDate} - {data.endDate}
                </div>
                <div className="font-medium">{data.duration} days off</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default NextHoliday;
``;
