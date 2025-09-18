// app/(dashboard)/dashboard/planning/page.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  subDays,
  setHours,
  setMinutes,
  isToday,
  isSameDay,
  differenceInMinutes,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Timer,
  Building2,
  ListTodo,
  X,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  companyId: string;
  companyName: string;
  taskId?: string;
  taskName?: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  isBillable: boolean;
  status: "draft" | "submitted" | "approved";
}

interface Company {
  id: string;
  name: string;
  color: string;
  status?: string;
  type?: string;
}

interface Task {
  id: string;
  name: string;
  companyId: string;
  status: string;
  assignedTo?: any;
  reporter?: any;
  description?: string;
}

// Helper function to generate a color from company name if no color is set
const generateColorFromString = (str: string) => {
  const colors = [
    "#FF6B4A",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
    "#6366F1",
    "#84CC16",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function PlanningPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    day: number;
    time: number;
  } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; time: number } | null>(
    null
  );
  // Changed default view hours from 8-18 to 6-20
  const [viewHours, setViewHours] = useState({ start: 6, end: 20 });
  const [isCreating, setIsCreating] = useState(false);
  const [dragSelection, setDragSelection] = useState<{
    day: number;
    startTime: number;
    endTime: number;
  } | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // New state for API data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCompanyTasks, setSelectedCompanyTasks] = useState<Task[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingTimeEntries, setIsLoadingTimeEntries] = useState(true);

  const gridRef = useRef<HTMLDivElement>(null);
  const popoverTriggerRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        if (!response.ok) throw new Error("Failed to fetch companies");
        const data = await response.json();

        // Add colors to companies if they don't have one
        const companiesWithColors = data.companies.map((company: any) => ({
          ...company,
          color: company.color || generateColorFromString(company.name),
        }));

        setCompanies(companiesWithColors);
      } catch (error) {
        console.error("Error fetching companies:", error);
        toast.error("Failed to load companies");
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch time entries
  useEffect(() => {
    const fetchTimeEntries = async () => {
      try {
        const response = await fetch("/api/time-entries");
        if (!response.ok) throw new Error("Failed to fetch time entries");
        const data = await response.json();

        // Transform the data to match our interface
        const transformedEntries = data.entries.map((entry: any) => ({
          id: entry.id,
          companyId: entry.companyId || "",
          companyName: entry.company?.name || "No Company",
          taskId: entry.taskId || undefined,
          taskName: entry.task?.name || undefined,
          description: entry.description || "",
          startTime: new Date(entry.startTime),
          endTime: new Date(entry.endTime),
          duration: Math.floor(entry.duration / 60), // Convert seconds to minutes
          isBillable: entry.isBillable,
          status: "draft" as const,
        }));

        setTimeEntries(transformedEntries);
      } catch (error) {
        console.error("Error fetching time entries:", error);
        // Don't show error toast if the API endpoint doesn't exist yet
      } finally {
        setIsLoadingTimeEntries(false);
      }
    };

    fetchTimeEntries();
  }, []);

  // Fetch tasks for selected company
  useEffect(() => {
    const fetchTasksForCompany = async (companyId: string) => {
      if (!companyId) {
        setSelectedCompanyTasks([]);
        return;
      }

      setIsLoadingTasks(true);
      try {
        const response = await fetch(`/api/companies/${companyId}/tasks`);
        if (!response.ok) throw new Error("Failed to fetch tasks");
        const data = await response.json();
        setSelectedCompanyTasks(data.tasks || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setSelectedCompanyTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    if (selectedEntry?.companyId) {
      fetchTasksForCompany(selectedEntry.companyId);
    }
  }, [selectedEntry?.companyId]);

  // Calculate week days
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  });

  // Generate time slots
  const timeSlots: number[] = [];
  for (let hour = viewHours.start; hour < viewHours.end; hour++) {
    timeSlots.push(hour);
  }

  // Navigate weeks
  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) =>
      direction === "next" ? addDays(prev, 7) : subDays(prev, 7)
    );
  };

  // Calculate position for time entry
  const getEntryPosition = (entry: TimeEntry) => {
    const dayIndex = weekDays.findIndex((day) =>
      isSameDay(day, entry.startTime)
    );
    if (dayIndex === -1) return null;

    const startMinutes =
      entry.startTime.getHours() * 60 + entry.startTime.getMinutes();
    const startOffset = startMinutes - viewHours.start * 60;
    const top = (startOffset / 60) * 60; // 60px per hour

    const duration = differenceInMinutes(entry.endTime, entry.startTime);
    const height = Math.max(20, (duration / 60) * 60); // Minimum height of 20px

    return {
      left: `${dayIndex * 14.285}%`, // 100% / 7 days
      top: `${top}px`,
      height: `${height}px`,
      width: "14.285%",
    };
  };

  // Handle drag to create time slot
  const handleMouseDown = (
    e: React.MouseEvent,
    dayIndex: number,
    hour: number,
    minutes: number = 0
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);
    const startMinutes = Math.round((hour * 60 + minutes) / 5) * 5;
    setDragStart({ day: dayIndex, time: startMinutes });
    setDragEnd({ day: dayIndex, time: startMinutes + 30 });
    setPopoverAnchor({ x: rect.left + rect.width, y: rect.top });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStart || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dayWidth = rect.width / 7;
      const totalHours = viewHours.end - viewHours.start;
      const hourHeight = rect.height / totalHours;

      const rawDayIndex = Math.floor(x / dayWidth);
      const dayIndex = Math.max(0, Math.min(6, rawDayIndex));

      const hoursFromTop = y / hourHeight;
      const minutesFromStart = (viewHours.start + hoursFromTop) * 60;

      const roundedMinutes = Math.round(minutesFromStart / 5) * 5;

      const clampedMinutes = Math.max(
        viewHours.start * 60,
        Math.min(viewHours.end * 60, roundedMinutes)
      );

      setDragEnd({
        day: dayIndex,
        time: Math.max(dragStart.time + 15, clampedMinutes),
      });
    },
    [isDragging, dragStart, viewHours.start, viewHours.end]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dragStart && dragEnd) {
        // Keep the selection visible
        setDragSelection({
          day: dragStart.day,
          startTime: dragStart.time,
          endTime: dragEnd.time,
        });

        setIsCreating(true);
        setSelectedEntry({
          id: `temp-${Date.now()}`,
          companyId: "",
          companyName: "",
          description: "",
          startTime: setMinutes(
            setHours(weekDays[dragStart.day], Math.floor(dragStart.time / 60)),
            dragStart.time % 60
          ),
          endTime: setMinutes(
            setHours(weekDays[dragEnd.day], Math.floor(dragEnd.time / 60)),
            dragEnd.time % 60
          ),
          duration: dragEnd.time - dragStart.time,
          isBillable: true,
          status: "draft",
        });

        // Place the popover anchor near the selection
        if (gridRef.current) {
          const rect = gridRef.current.getBoundingClientRect();
          const dayWidth = rect.width / 7;
          const x = rect.left + (dragStart.day + 1) * dayWidth + 10;
          const y =
            rect.top + ((dragStart.time - viewHours.start * 60) / 60) * 60;
          setPopoverAnchor({ x, y });
        }

        // Defer opening so the mouseup/outside-click doesn't immediately close it
        requestAnimationFrame(() => {
          justOpenedRef.current = true;
          setPopoverOpen(true);
          setTimeout(() => {
            justOpenedRef.current = false;
          }, 0);
        });
      }
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    },
    [isDragging, dragStart, dragEnd, weekDays, viewHours.start]
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Save time entry
  const saveTimeEntry = async (entry: TimeEntry) => {
    try {
      if (isCreating) {
        // Create new time entry via API
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: entry.companyId || null,
            taskId: entry.taskId || null,
            description: entry.description,
            startTime: entry.startTime.toISOString(),
            endTime: entry.endTime.toISOString(),
            duration: entry.duration * 60, // Convert minutes to seconds
            isBillable: entry.isBillable,
          }),
        });

        if (!response.ok) throw new Error("Failed to create time entry");

        const newEntry = await response.json();
        setTimeEntries((prev) => [
          ...prev,
          {
            ...entry,
            id: newEntry.id,
          },
        ]);
        toast.success("Time entry created");
      } else {
        // Update existing time entry via API
        const response = await fetch(`/api/time-entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: entry.companyId || null,
            taskId: entry.taskId || null,
            description: entry.description,
            startTime: entry.startTime.toISOString(),
            endTime: entry.endTime.toISOString(),
            duration: entry.duration * 60,
            isBillable: entry.isBillable,
          }),
        });

        if (!response.ok) throw new Error("Failed to update time entry");

        setTimeEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? entry : e))
        );
        toast.success("Time entry updated");
      }
    } catch (error) {
      console.error("Error saving time entry:", error);
      // Fallback to local state update if API is not ready
      if (isCreating) {
        setTimeEntries((prev) => [
          ...prev,
          { ...entry, id: Date.now().toString() },
        ]);
      } else {
        setTimeEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? entry : e))
        );
      }
      toast.success(isCreating ? "Time entry created" : "Time entry updated");
    }

    setSelectedEntry(null);
    setIsCreating(false);
    setPopoverOpen(false);
    setDragSelection(null);
  };

  // Delete time entry
  const deleteTimeEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete time entry");

      setTimeEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Time entry deleted");
    } catch (error) {
      console.error("Error deleting time entry:", error);
      // Fallback to local state update if API is not ready
      setTimeEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Time entry deleted");
    }

    setSelectedEntry(null);
    setPopoverOpen(false);
  };

  // Handle popover close
  const handlePopoverClose = () => {
    setPopoverOpen(false);
    setSelectedEntry(null);
    setDragSelection(null);
    setIsCreating(false);
  };

  // Calculate week totals
  const weekTotal = timeEntries.reduce((acc, entry) => acc + entry.duration, 0);
  const dailyTotals = weekDays.map((day) =>
    timeEntries
      .filter((entry) => isSameDay(entry.startTime, day))
      .reduce((acc, entry) => acc + entry.duration, 0)
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              className="rounded-lg border-0"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
            >
              This Week
            </Button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek("prev")}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(weekDays[0], "MMM d")} -{" "}
                {format(weekDays[6], "MMM d, yyyy")}
              </span>
              <button
                onClick={() => navigateWeek("next")}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Hours Selector - Updated with European time format */}
            <Select
              value={`${viewHours.start}-${viewHours.end}`}
              onValueChange={(value) => {
                const [start, end] = value.split("-").map(Number);
                setViewHours({ start, end });
              }}
            >
              <SelectTrigger className="w-52 rounded-lg bg-gray-50">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-24">All Day (00:00 - 24:00)</SelectItem>
                <SelectItem value="6-20">06:00 - 20:00</SelectItem>
                <SelectItem value="6-18">06:00 - 18:00</SelectItem>
                <SelectItem value="8-18">08:00 - 18:00</SelectItem>
                <SelectItem value="9-17">09:00 - 17:00</SelectItem>
                <SelectItem value="7-19">07:00 - 19:00</SelectItem>
              </SelectContent>
            </Select>

            {/* Week Total */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <Timer className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">
                {Math.floor(weekTotal / 60)}h {weekTotal % 60}m this week
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="min-w-[1000px] h-full">
            {/* Day Headers */}
            <div className="grid ml-[63px] border-l grid-cols-7 border-b">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "px-4 py-3 border-r flex items-center justify-between text-center"
                  )}
                >
                  <div
                    className={cn(
                      "text-sm font-semibold text-[#636363]",
                      isToday(day) && "text-[#1F1F1F] font-semibold"
                    )}
                  >
                    {format(day, "EEEE")}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold ml-auto text-[#636363]",
                      isToday(day) &&
                        "text-white bg-[#FF6B4A] size-6 rounded-full flex items-center justify-center"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative" ref={gridRef}>
              {/* Hour Rows - Updated with European 24h format */}
              {timeSlots.map((hour, i) => (
                <div key={hour} className="flex h-[60px]">
                  <div
                    className={`w-16 -mt-3 mx-auto font-semibold px-2 text-center py-1 text-xs text-gray-500 border-r`}
                  >
                    {/* European 24h format */}
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 border-b grid grid-cols-7">
                    {weekDays.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={cn("border-r cursor-pointer")}
                        onMouseDown={(e) => handleMouseDown(e, dayIndex, hour)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Time Entries */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ marginLeft: "64px" }}
              >
                {timeEntries.map((entry) => {
                  const position = getEntryPosition(entry);
                  if (!position) return null;

                  const company = companies.find(
                    (c) => c.id === entry.companyId
                  );

                  const duration = differenceInMinutes(
                    entry.endTime,
                    entry.startTime
                  );
                  const isShort = duration < 45; // Less than 30 minutes

                  return (
                    <div
                      key={entry.id}
                      className="absolute border pointer-events-auto cursor-pointer rounded-lg overflow-hidden"
                      style={{
                        ...position,
                        backgroundColor: company?.color
                          ? `${company.color}1D`
                          : "#9CA3AF1D",
                        borderColor: company?.color
                          ? `${company.color}3d`
                          : "#9CA3AF4d",
                      }}
                      onClick={(e) => {
                        const rect = (
                          e.currentTarget as HTMLDivElement
                        ).getBoundingClientRect();
                        setPopoverAnchor({ x: rect.right + 10, y: rect.top });
                        setSelectedEntry(entry);
                        setIsCreating(false);
                        requestAnimationFrame(() => {
                          justOpenedRef.current = true;
                          setPopoverOpen(true);
                          setTimeout(() => {
                            justOpenedRef.current = false;
                          }, 0);
                        });
                      }}
                    >
                      <div
                        className={cn(
                          "py-1.5 px-2 text-sm h-full flex",
                          isShort ? "flex-row items-center gap-1" : "flex-col"
                        )}
                      >
                        <div className="font-medium truncate text-xs">
                          {entry.companyName || "No Company"}
                        </div>
                        {!isShort && entry.taskName && (
                          <div className="truncate text-xs opacity-80">
                            {entry.taskName}
                          </div>
                        )}
                        <div
                          className={cn(
                            "text-[10px] font-medium",
                            isShort ? "ml-auto whitespace-nowrap" : "mt-auto"
                          )}
                        >
                          {/* European 24h format */}
                          {format(entry.startTime, "HH:mm")} -{" "}
                          {format(entry.endTime, "HH:mm")}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drag Preview / Selection */}
                {(isDragging || dragSelection) &&
                  (dragStart || dragSelection) &&
                  (dragEnd || dragSelection) && (
                    <div
                      className="absolute bg-[#FF6B4A]/10 border border-[#FF6B4A]/30 rounded-lg pointer-events-none"
                      style={{
                        left: `${(dragSelection?.day ?? dragStart?.day ?? 0) * 14.285}%`,
                        top: `${
                          (((dragSelection?.startTime ?? dragStart?.time ?? 0) -
                            viewHours.start * 60) /
                            60) *
                          60
                        }px`,
                        width: "14.285%",
                        height: `${
                          (((dragSelection?.endTime ?? dragEnd?.time ?? 0) -
                            (dragSelection?.startTime ??
                              dragStart?.time ??
                              0)) /
                            60) *
                          60
                        }px`,
                      }}
                    >
                      <div className="p-2 text-xs font-medium">
                        New time entry
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entry Popover */}
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          if (!open) handlePopoverClose();
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <div
            ref={popoverTriggerRef}
            style={{
              position: "fixed",
              left: popoverAnchor ? popoverAnchor.x : -9999,
              top: popoverAnchor ? popoverAnchor.y : -9999,
              width: 1,
              height: 1,
            }}
          />
        </PopoverTrigger>

        <PopoverContent
          className="w-96 p-0"
          align="start"
          side="right"
          sideOffset={5}
          onInteractOutside={(e) => {
            if (justOpenedRef.current) e.preventDefault();
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {selectedEntry && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {isCreating ? "New Time Entry" : "Edit Time Entry"}
                </h3>
                <button
                  onClick={handlePopoverClose}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Company Selection */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Company
                  </label>
                  <Select
                    value={selectedEntry.companyId}
                    onValueChange={(value) => {
                      const company = companies.find((c) => c.id === value);
                      setSelectedEntry({
                        ...selectedEntry,
                        companyId: value,
                        companyName: company?.name || "",
                        taskId: undefined,
                        taskName: undefined,
                      });
                    }}
                    disabled={isLoadingCompanies}
                  >
                    <SelectTrigger>
                      {isLoadingCompanies ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Building2 className="h-4 w-4 mr-2" />
                      )}
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: company.color }}
                            />
                            {company.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Task Selection */}
                {selectedEntry.companyId && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Task
                    </label>
                    <Select
                      value={selectedEntry.taskId}
                      onValueChange={(value) => {
                        const task = selectedCompanyTasks.find(
                          (t) => t.id === value
                        );
                        setSelectedEntry({
                          ...selectedEntry,
                          taskId: value,
                          taskName: task?.name || "",
                        });
                      }}
                      disabled={isLoadingTasks}
                    >
                      <SelectTrigger>
                        {isLoadingTasks ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ListTodo className="h-4 w-4 mr-2" />
                        )}
                        <SelectValue placeholder="Select task (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCompanyTasks.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            No tasks available for this company
                          </div>
                        ) : (
                          selectedCompanyTasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              <div className="flex items-center gap-2">
                                <span>{task.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({task.status})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Description
                  </label>
                  <Textarea
                    value={selectedEntry.description}
                    onChange={(e) =>
                      setSelectedEntry({
                        ...selectedEntry,
                        description: e.target.value,
                      })
                    }
                    placeholder="What did you work on?"
                    className="min-h-[80px]"
                  />
                </div>

                {/* Time */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      Start
                    </label>
                    <Input
                      type="time"
                      value={format(selectedEntry.startTime, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value
                          .split(":")
                          .map(Number);
                        const newStartTime = setMinutes(
                          setHours(selectedEntry.startTime, hours),
                          minutes
                        );
                        const duration = differenceInMinutes(
                          selectedEntry.endTime,
                          newStartTime
                        );
                        setSelectedEntry({
                          ...selectedEntry,
                          startTime: newStartTime,
                          duration: duration,
                        });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      End
                    </label>
                    <Input
                      type="time"
                      value={format(selectedEntry.endTime, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value
                          .split(":")
                          .map(Number);
                        const newEndTime = setMinutes(
                          setHours(selectedEntry.endTime, hours),
                          minutes
                        );
                        const duration = differenceInMinutes(
                          newEndTime,
                          selectedEntry.startTime
                        );
                        setSelectedEntry({
                          ...selectedEntry,
                          endTime: newEndTime,
                          duration: duration,
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Billable Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Billable</label>
                  <button
                    onClick={() =>
                      setSelectedEntry({
                        ...selectedEntry,
                        isBillable: !selectedEntry.isBillable,
                      })
                    }
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors",
                      selectedEntry.isBillable ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 bg-white rounded-full transition-transform",
                        selectedEntry.isBillable
                          ? "translate-x-6"
                          : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {!isCreating && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTimeEntry(selectedEntry.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePopoverClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveTimeEntry(selectedEntry)}
                    className="flex-1 bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
                    disabled={!selectedEntry.description}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
