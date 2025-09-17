// components/timeline/gantt-timeline.tsx
"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addDays,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  addMonths,
  subMonths,
  isWeekend,
  isSameMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ListTodo,
  AlertCircle,
  CheckCircle2,
  ClockAlert,
  CalendarDays,
  Grid3x3,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  GripHorizontal,
  Download,
  Upload,
  ClipboardClock,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/types/kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface GanttTimelineProps {
  companyId: string;
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (date?: Date) => void;
}

export function GanttTimeline({
  companyId,
  tasks,
  onTaskUpdate,
  onTaskClick,
  onCreateTask,
}: GanttTimelineProps) {
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTaskId, setResizeTaskId] = useState<string | null>(null);
  const [resizeSide, setResizeSide] = useState<"start" | "end" | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [originalDates, setOriginalDates] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Refs for synchronized scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Calculate date range
  const dateRange = useMemo(() => {
    let start, end;

    if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
      start = startOfWeek(start, { weekStartsOn: 1 });
      end = endOfWeek(end, { weekStartsOn: 1 });
    }

    const days = eachDayOfInterval({ start, end });
    return { start, end, days };
  }, [currentDate, viewMode]);

  // Filter tasks
  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch = task.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || task.status === statusFilter;
        const matchesPriority =
          priorityFilter === "all" || task.priority === priorityFilter;
        const hasDate = task.startDate || task.dueDate;

        return matchesSearch && matchesStatus && matchesPriority && hasDate;
      })
      .map((task) => ({
        ...task,
        startDate: task.startDate
          ? new Date(task.startDate)
          : new Date(task.dueDate!),
        dueDate: task.dueDate
          ? new Date(task.dueDate)
          : new Date(task.startDate!),
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Synchronized scrolling
  const handleHeaderScroll = useCallback(() => {
    if (!isScrolling.current && headerRef.current && bodyRef.current) {
      isScrolling.current = true;
      bodyRef.current.scrollLeft = headerRef.current.scrollLeft;
      isScrolling.current = false;
    }
  }, []);

  const handleBodyScroll = useCallback(() => {
    if (!isScrolling.current && headerRef.current && bodyRef.current) {
      isScrolling.current = true;
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
      isScrolling.current = false;
    }
  }, []);

  // Calculate task position
  const getTaskPosition = useCallback(
    (task: any) => {
      const columnWidth = 120;
      const startDay = Math.max(
        0,
        differenceInDays(task.startDate, dateRange.start)
      );
      const endDay = Math.min(
        dateRange.days.length,
        differenceInDays(task.dueDate, dateRange.start) + 1
      );

      if (startDay >= dateRange.days.length || endDay <= 0) return null;

      const left = startDay * columnWidth;
      const width = (endDay - startDay) * columnWidth;

      return { left: `${left}px`, width: `${width}px` };
    },
    [dateRange]
  );

  // Start dragging (move task)
  const handleDragStart = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const task = visibleTasks.find((t) => t.id === taskId);
    if (!task) return;

    setIsDragging(true);
    setDraggedTaskId(taskId);
    setDragStartX(e.clientX);
    setDragStartDate(task.startDate);
  };

  // Start resizing
  const handleResizeStart = (
    e: React.MouseEvent,
    taskId: string,
    side: "start" | "end"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const task = visibleTasks.find((t) => t.id === taskId);
    if (!task) return;

    setIsResizing(true);
    setResizeTaskId(taskId);
    setResizeSide(side);
    setResizeStartX(e.clientX);
    setOriginalDates({ start: task.startDate, end: task.dueDate });
  };

  // Handle mouse move for drag/resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const columnWidth = 120;

      if (isDragging && draggedTaskId && dragStartDate) {
        const deltaX = e.clientX - dragStartX;
        const daysDelta = Math.round(deltaX / columnWidth);

        const task = visibleTasks.find((t) => t.id === draggedTaskId);
        if (!task) return;

        const duration = differenceInDays(task.dueDate, task.startDate);
        const newStartDate = addDays(dragStartDate, daysDelta);
        const newEndDate = addDays(newStartDate, duration);

        onTaskUpdate?.(draggedTaskId, {
          startDate: newStartDate,
          dueDate: newEndDate,
        });
      }

      if (isResizing && resizeTaskId && originalDates && resizeSide) {
        const deltaX = e.clientX - resizeStartX;
        const daysDelta = Math.round(deltaX / columnWidth);

        let newStartDate = originalDates.start;
        let newEndDate = originalDates.end;

        if (resizeSide === "start") {
          newStartDate = addDays(originalDates.start, daysDelta);
          if (newStartDate >= newEndDate) {
            newStartDate = addDays(newEndDate, -1);
          }
        } else {
          newEndDate = addDays(originalDates.end, daysDelta);
          if (newEndDate <= newStartDate) {
            newEndDate = addDays(newStartDate, 1);
          }
        }

        onTaskUpdate?.(resizeTaskId, {
          startDate: newStartDate,
          dueDate: newEndDate,
        });
      }
    };

    const handleMouseUp = async () => {
      if (isDragging && draggedTaskId) {
        const task = visibleTasks.find((t) => t.id === draggedTaskId);
        if (task) {
          try {
            await fetch(`/api/tasks/${draggedTaskId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                startDate: task.startDate,
                dueDate: task.dueDate,
              }),
            });
            toast.success("Task moved");
          } catch (error) {
            toast.error("Failed to move task");
          }
        }
      }

      if (isResizing && resizeTaskId) {
        const task = visibleTasks.find((t) => t.id === resizeTaskId);
        if (task) {
          try {
            await fetch(`/api/tasks/${resizeTaskId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                startDate: task.startDate,
                dueDate: task.dueDate,
              }),
            });
            toast.success("Task duration updated");
          } catch (error) {
            toast.error("Failed to update task");
          }
        }
      }

      // Reset all states
      setIsDragging(false);
      setDraggedTaskId(null);
      setDragStartX(0);
      setDragStartDate(null);
      setIsResizing(false);
      setResizeTaskId(null);
      setResizeSide(null);
      setResizeStartX(0);
      setOriginalDates(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = isResizing ? "ew-resize" : "grabbing";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [
    isDragging,
    isResizing,
    draggedTaskId,
    resizeTaskId,
    dragStartX,
    resizeStartX,
    dragStartDate,
    originalDates,
    resizeSide,
    visibleTasks,
    onTaskUpdate,
  ]);

  // Helper functions for status and priority
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <ChevronsUp className="h-3.5 w-3.5 text-red-500" />;
      case "HIGH":
        return <ChevronUp className="h-3.5 w-3.5 text-orange-500" />;
      case "MEDIUM":
        return <GripHorizontal className="h-3.5 w-3.5 text-yellow-500" />;
      case "LOW":
        return <ChevronDown className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return <GripHorizontal className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-transparent text-red-700 border-transparent";
      case "HIGH":
        return "bg-transparent text-orange-700 border-transparent";
      case "MEDIUM":
        return "bg-transparent text-yellow-700 border-transparent";
      case "LOW":
        return "bg-transparent text-gray-500 border-transparent";
      default:
        return "bg-transparent text-gray-500 border-transparent";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "IN_PROGRESS":
        return "bg-[#FF6B4A]/10 text-[#FF6B4A] border-[#FF6B4A]";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-500";
      case "IN_PROGRESS":
        return "bg-blue-500";
      case "REVIEW":
        return "bg-yellow-500";
      case "COMPLETED":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  // Navigate dates
  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentDate((prev) =>
        direction === "next" ? addDays(prev, 7) : addDays(prev, -7)
      );
    } else {
      setCurrentDate((prev) =>
        direction === "next" ? addMonths(prev, 1) : subMonths(prev, -1)
      );
    }
  };

  // Stats
  const stats = useMemo(
    () => ({
      todo: tasks.filter(
        (t) => t.status === "TODO" && (t.startDate || t.dueDate)
      ).length,
      inProgress: tasks.filter(
        (t) => t.status === "IN_PROGRESS" && (t.startDate || t.dueDate)
      ).length,
      completed: tasks.filter(
        (t) => t.status === "COMPLETED" && (t.startDate || t.dueDate)
      ).length,
      overdue: tasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== "COMPLETED"
      ).length,
    }),
    [tasks]
  );

  // Scroll to today on mount
  useEffect(() => {
    const todayIndex = dateRange.days.findIndex(isToday);
    if (todayIndex !== -1 && bodyRef.current) {
      const scrollPosition =
        todayIndex * 120 - bodyRef.current.clientWidth / 2 + 60;
      bodyRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [dateRange.days]);

  const timelineWidth = dateRange.days.length * 120;

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Stats Bar */}
        <div className="grid px-3 grid-cols-4 gap-4 border-b">
          <div className="px-4 border-r py-1.5">
            <div className="flex items-center">
              <ListTodo className="h-4 mr-2 w-4 text-gray-600" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {stats.todo}
              </p>
              <p className="text-sm text-gray-500">Scheduled tasks</p>
            </div>
          </div>

          <div className="px-4 py-1.5 border-r">
            <div className="flex items-center">
              <AlertCircle className="h-4 mr-2 w-4 text-blue-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {stats.inProgress}
              </p>
              <p className="text-sm text-gray-500">In progress</p>
            </div>
          </div>

          <div className="px-4 py-1.5 border-r">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 mr-2 w-4 text-green-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {stats.completed}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>

          <div className="px-4 py-1.5">
            <div className="flex items-center">
              <ClockAlert className="h-4 mr-2 w-4 text-red-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {stats.overdue}
              </p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
            {/* Timeline Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate("prev")}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium min-w-[160px] text-center">
                    {viewMode === "week"
                      ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
                      : format(currentDate, "MMMM yyyy")}
                  </span>
                  <button
                    onClick={() => navigate("next")}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>

              <div className="text-sm text-gray-500">
                {visibleTasks.length} tasks • Drag center to move • Drag edges
                to resize • Double-click for details
              </div>
            </div>

            {/* Timeline Grid Container */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Days Header - Synchronized scroll */}
              <div
                ref={headerRef}
                className="overflow-x-auto overflow-y-hidden border-b"
                onScroll={handleHeaderScroll}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex" style={{ width: `${timelineWidth}px` }}>
                  {dateRange.days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 px-3 py-2 text-center border-r",
                        "w-[120px]",
                        isWeekend(day) && "bg-gray-50",
                        isToday(day) && "bg-[#FF6B4A]/10"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs",
                          isToday(day) && "font-semibold text-[#FF6B4A]"
                        )}
                      >
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isToday(day) ? "text-[#FF6B4A]" : "text-gray-900",
                          !isSameMonth(day, currentDate) && "text-gray-400"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Body - Synchronized scroll */}
              <div
                ref={bodyRef}
                className="flex-1 overflow-auto"
                onScroll={handleBodyScroll}
              >
                <div
                  className="relative"
                  style={{ width: `${timelineWidth}px`, minHeight: "400px" }}
                >
                  {/* Background Grid */}
                  <div className="absolute inset-0 flex">
                    {dateRange.days.map((day, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-shrink-0 border-r",
                          "w-[120px]",
                          isWeekend(day) && "bg-gray-50/50",
                          isToday(day) && "bg-[#FF6B4A]/10"
                        )}
                      />
                    ))}
                  </div>

                  {/* Today Line */}
                  {dateRange.days.some(isToday) && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#FF6B4A] z-20 pointer-events-none"
                      style={{
                        left: `${(dateRange.days.findIndex(isToday) + 0.5) * 120}px`,
                      }}
                    />
                  )}

                  {/* Task Bars */}
                  <div className="relative pt-3">
                    {visibleTasks.map((task) => {
                      const position = getTaskPosition(task);
                      if (!position) return null;

                      return (
                        <div key={task.id} className="relative h-12 mb-2 group">
                          <div
                            className={cn(
                              "absolute top-1 h-10 rounded-lg",
                              getStatusBarColor(task.status),
                              task.status === "COMPLETED" && "opacity-70",
                              selectedTaskId === task.id &&
                                "ring-2 ring-blue-400 ring-offset-1",
                              (draggedTaskId === task.id ||
                                resizeTaskId === task.id) &&
                                "opacity-50"
                            )}
                            style={{
                              left: position.left,
                              width: position.width,
                              minWidth: "80px",
                            }}
                          >
                            {/* Left resize handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 rounded-l-lg"
                              onMouseDown={(e) =>
                                handleResizeStart(e, task.id, "start")
                              }
                            />

                            {/* Center drag area */}
                            <div
                              className="absolute inset-x-2 inset-y-0 flex items-center gap-2 px-2 cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => handleDragStart(e, task.id)}
                              onDoubleClick={() => {
                                setSelectedTaskId(task.id);
                                onTaskClick?.(task);
                              }}
                            >
                              <GripVertical className="h-4 w-4 text-white/50 flex-shrink-0" />
                              {task.assignedTo && (
                                <Avatar className="h-5 w-5 border border-white/30 flex-shrink-0">
                                  <AvatarFallback className="text-[9px] bg-white/20 text-white">
                                    {task.assignedTo.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="truncate text-white text-sm font-medium">
                                {task.name}
                              </span>
                            </div>

                            {/* Right resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/20 rounded-r-lg"
                              onMouseDown={(e) =>
                                handleResizeStart(e, task.id, "end")
                              }
                            />

                            {/* Date tooltips on hover */}
                            <div className="absolute -top-6 left-0 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {format(task.startDate, "MMM d")}
                            </div>
                            <div className="absolute -top-6 right-0 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {format(task.dueDate, "MMM d")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visibleTasks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                          No tasks scheduled for this period
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l h-full flex flex-col">
        {/* Add Task Button */}
        <div className="p-4 border-b w-full">
          <Button
            onClick={() => onCreateTask?.()}
            className="bg-[#FF6B4A] w-full hover:bg-[#FF6B4A]/90 rounded-xl h-11"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {/* Filters Section */}
        <div className="space-y-4 p-4 border-b">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50 rounded-xl h-11 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Status and Priority Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-50 min-h-11 rounded-xl w-full border-gray-200 focus:bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Priority
              </label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="bg-gray-50 min-h-11 rounded-xl w-full border-gray-200 focus:bg-white">
                  <SelectValue placeholder="All Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* View Mode */}
        <div className="space-y-4 p-4 border-b">
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              View Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                className={
                  viewMode === "month"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <CalendarDays className="h-4 w-4 mr-1.5" />
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                className={
                  viewMode === "week"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Week
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 p-4 border-b">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <Download className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Export Timeline
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <Upload className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Import Tasks
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <ClipboardClock className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Task History
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
