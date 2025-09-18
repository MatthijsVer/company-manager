// components/analytics/DailyTasks.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { formatDistanceToNow, isAfter, format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: Date | null;
  priority: string;
  completed: boolean;
  status: string;
  project?: string;
  projectColor?: string;
  isOverdue: boolean;
  totalTimeSpent: number;
  commentsCount: number;
  attachmentsCount: number;
}

interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  highPriority: number;
}

interface DailyTasksProps {
  userId?: string;
  limit?: number;
  showCompleted?: boolean;
}

export function DailyTasks({
  userId = "me",
  limit = 8,
  showCompleted = true,
}: DailyTasksProps) {
  const [viewType, setViewType] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    total: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0,
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        view: viewType,
        limit: limit.toString(),
        includeCompleted: showCompleted.toString(),
      });

      const response = await fetch(`/api/tasks/daily?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();

      // Transform dates
      const transformedTasks = data.tasks.map((task: any) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : null,
      }));

      setTasks(transformedTasks);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      // Fallback to mock data if API fails
      setTasks(getMockTasks());
      setSummary({
        total: 8,
        completed: 1,
        overdue: 0,
        highPriority: 3,
      });
    } finally {
      setLoading(false);
    }
  }, [viewType, limit, showCompleted]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      setUpdating(taskId);

      // Optimistic update
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, completed: !currentStatus } : task
        )
      );

      // Update summary optimistically
      setSummary((prev) => ({
        ...prev,
        completed: currentStatus ? prev.completed - 1 : prev.completed + 1,
      }));

      const response = await fetch("/api/tasks/daily", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completed: !currentStatus }),
      });

      if (!response.ok) {
        // Revert on error
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, completed: currentStatus } : task
          )
        );
        setSummary((prev) => ({
          ...prev,
          completed: currentStatus ? prev.completed + 1 : prev.completed - 1,
        }));
        throw new Error("Failed to update task");
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    } finally {
      setUpdating(null);
    }
  };

  const getMockTasks = (): Task[] => {
    const now = new Date();
    return [
      {
        id: "1",
        title: "Review Q2 analytics report",
        deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        priority: "high",
        completed: false,
        status: "IN_PROGRESS",
        project: "Analytics Dashboard",
        projectColor: "#8b5cf6",
        isOverdue: false,
        totalTimeSpent: 7200,
        commentsCount: 3,
        attachmentsCount: 2,
      },
      {
        id: "2",
        title: "Update team on project progress",
        deadline: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        priority: "high",
        completed: false,
        status: "TODO",
        project: "Team Sync",
        projectColor: "#3b82f6",
        isOverdue: false,
        totalTimeSpent: 0,
        commentsCount: 0,
        attachmentsCount: 0,
      },
      {
        id: "3",
        title: "Complete code review for PR #234",
        deadline: new Date(now.getTime() + 4 * 60 * 60 * 1000),
        priority: "medium",
        completed: true,
        status: "COMPLETED",
        project: "Development",
        projectColor: "#10b981",
        isOverdue: false,
        totalTimeSpent: 3600,
        commentsCount: 5,
        attachmentsCount: 0,
      },
    ];
  };

  const getTimeUntil = (deadline: Date | null) => {
    if (!deadline) return "No deadline";

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff < 0) return "Overdue";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    if (hours < 24) return `${hours}h ${minutes}m`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "Tomorrow";
    if (days < 7) return `${days} days`;

    return format(deadline, "MMM d");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (
      priority.toLowerCase() === "urgent" ||
      priority.toLowerCase() === "high"
    ) {
      return <AlertCircle className="size-3" />;
    }
    return <Circle className="size-3" />;
  };

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0 && minutes === 0) return "";
    if (hours === 0) return `${minutes}m tracked`;
    return `${hours}h ${minutes}m tracked`;
  };

  if (loading) {
    return (
      <Card className="h-full col-span-3 rounded-3xl border-none bg-white">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse text-gray-400">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full rounded-3xl border-none bg-white">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <h3 className="uppercase font-semibold">Daily Tasks</h3>
          <div className="flex items-center gap-2">
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <PlusCircle
                className={`size-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={fetchTasks}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 text-gray-500 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <Select
              value={viewType}
              onValueChange={(value: any) => setViewType(value)}
            >
              <SelectTrigger className="bg-gray-100 border text-xs rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 -mt-3">
        {/* Progress Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="pr-6 border-r">
              <div className="text-4xl font-medium">
                {summary.completed}/{summary.total}
              </div>
              <div className="text-sm text-gray-500 mt-1">Completed</div>
            </div>
            <div className="text-[12px] flex flex-col ml-6 text-gray-400">
              Tasks sorted by deadline
              <span className="font-medium">Earliest first</span>
            </div>
          </div>

          {summary.overdue > 0 && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="size-4" />
              <span className="text-sm font-medium">
                {summary.overdue} overdue
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300"
            style={{
              width: `${summary.total > 0 ? (summary.completed / summary.total) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Tasks List */}
        <div className="space-y-0.5 mt-4 max-h-[500px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="size-12 mx-auto mb-2 text-green-400" />
              <p className="text-sm">
                No tasks for {viewType === "today" ? "today" : "this week"}
              </p>
              <p className="text-xs mt-1">
                Great job staying on top of things!
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center gap-4 py-3 rounded-xl transition-all duration-200 ${
                  task.completed ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id, task.completed)}
                  disabled={updating === task.id}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm ${
                      task.completed ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {task.title}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {task.project && (
                      <div className="flex items-center gap-1">
                        <div
                          className="size-2 rounded-full"
                          style={{
                            backgroundColor: task.projectColor || "#6b7280",
                          }}
                        />
                        <span className="text-xs text-gray-500">
                          {task.project}
                        </span>
                      </div>
                    )}
                    {task.totalTimeSpent > 0 && (
                      <span className="text-xs text-gray-400">
                        {formatTimeSpent(task.totalTimeSpent)}
                      </span>
                    )}
                    {task.commentsCount > 0 && (
                      <span className="text-xs text-gray-400">
                        {task.commentsCount} comments
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}
                  >
                    {getPriorityIcon(task.priority)}
                    <span className="text-xs font-medium capitalize">
                      {task.priority.toLowerCase()}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1 text-sm ${
                      task.isOverdue && !task.completed
                        ? "text-red-600 font-medium"
                        : task.completed
                          ? "text-gray-400"
                          : "text-gray-600"
                    }`}
                  >
                    <Clock className="size-3" />
                    <span className="font-medium">
                      {getTimeUntil(task.deadline)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DailyTasks;
