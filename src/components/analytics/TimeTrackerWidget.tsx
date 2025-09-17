// components/analytics/TimeTrackerWidget.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, ChevronRight, Euro } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Company {
  id: string;
  name: string;
  color: string | null;
}

interface Task {
  id: string;
  name: string;
  companyId: string | null;
}

interface TimeEntry {
  id: string;
  description: string;
  company: Company | null;
  task: Task | null;
  startTime: string;
  duration: number;
  isRunning: boolean;
  isBillable: boolean;
}

export function TimeTrackerWidget() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // seconds elapsed
  const [description, setDescription] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isBillable, setIsBillable] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [currentRunningId, setCurrentRunningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Correct TS type for browser setInterval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Anchor to a specific start time; we compute elapsed from this
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    fetchCompanies();
    fetchTimeEntries();
    checkRunningTimer();
  }, []);

  // Tick based on real time (no drift, StrictMode-safe)
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval before creating a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const tick = () => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setCurrentTime(elapsed);
    };

    // Run one immediate tick so the UI updates instantly
    tick();

    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (selectedCompany) {
      fetchTasks(selectedCompany.id);
    } else {
      setTasks([]);
      setSelectedTask(null);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies?limit=20");
      if (res.ok) {
        const data = await res.json();
        const companiesList = data.companies || [];
        setCompanies(companiesList);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const fetchTasks = async (companyId: string) => {
    try {
      const res = await fetch(`/api/tasks?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/time-entries?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries || data || [];
        const entriesArray = Array.isArray(entries) ? entries : [];

        const total = entriesArray.reduce(
          (sum: number, entry: TimeEntry) => sum + (entry.duration || 0),
          0
        );
        setTodayTotal(total);
      }
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkRunningTimer = async () => {
    try {
      const res = await fetch("/api/time-entries?isRunning=true");
      if (res.ok) {
        const data = await res.json();
        const entries = data.entries || data || [];
        const entriesArray = Array.isArray(entries) ? entries : [];

        if (entriesArray.length > 0) {
          const running: TimeEntry = entriesArray[0];
          setCurrentRunningId(running.id);
          setIsRunning(true);
          setDescription(running.description || "");
          setSelectedCompany(running.company);
          setSelectedTask(running.task);
          setIsBillable(!!running.isBillable);

          // ✅ anchor to server start time
          const startedAt = new Date(running.startTime).getTime();
          startTimeRef.current = startedAt;

          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          setCurrentTime(elapsed);

          if (running.company) {
            fetchTasks(running.company.id);
          }
        } else {
          // no running entry
          setIsRunning(false);
          startTimeRef.current = null;
          setCurrentTime(0);
        }
      }
    } catch (error) {
      console.error("Failed to check running timer:", error);
    }
  };

  const formatTimeDisplay = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggle = async () => {
    console.log("CLICKED");
    if (isRunning) {
      // Stop timer
      if (!currentRunningId) return;

      try {
        const res = await fetch("/api/time-entries/stop", {
          method: "POST",
        });

        if (res.ok) {
          setIsRunning(false);
          startTimeRef.current = null;
          setCurrentTime(0);
          setCurrentRunningId(null);
          toast.success("Timer stopped");
          fetchTimeEntries();
        } else {
          toast.error("Failed to stop timer");
        }
      } catch {
        toast.error("Failed to stop timer");
      }
    } else {
      // Start timer
      if (!description.trim()) {
        toast.error("Please enter a description");
        return;
      }

      try {
        const res = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: description,
            companyId: selectedCompany?.id || null,
            taskId: selectedTask?.id || null,
            isRunning: true,
            isBillable: isBillable,
            isInternal: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Accept either {entry} or the entry itself
          const entry = (data?.entry ?? data) as Partial<TimeEntry>;
          setCurrentRunningId((entry?.id as string) ?? null);

          // ✅ anchor to "now" (or server startTime if returned)
          const serverStart = entry?.startTime
            ? new Date(entry.startTime).getTime()
            : Date.now();
          startTimeRef.current = serverStart;

          setIsRunning(true);
          toast.success("Timer started");

          // Optional: refresh totals
          fetchTimeEntries();
        } else {
          toast.error("Failed to start timer");
        }
      } catch {
        toast.error("Failed to start timer");
      }
    }
  };

  // Calculate clock hand rotation (continuous minute/hour motion)
  const getClockRotation = () => {
    const totalSeconds = currentTime;
    const seconds = totalSeconds % 60;
    const minutes = (totalSeconds / 60) % 60; // continuous
    const hours = (totalSeconds / 3600) % 12; // continuous

    return {
      // -90° to put 0 at 12 o'clock (because 0° points right)
      second: seconds * 6 - 90, // 6° per second
      minute: minutes * 6 - 90, // 6° per minute
      hour: hours * 30 + minutes * 0.5 - 90, // 30° per hour + minute adjustment
    };
  };

  const { second, minute, hour } = getClockRotation();

  if (loading) {
    return (
      <Card className="col-span-2 rounded-3xl border-none">
        <CardContent className="flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 rounded-3xl border-none bg-white">
      <CardContent className="px-5">
        <div className="flex items-center gap-4">
          {/* Analog Clock */}
          <div className="relative size-34 flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-inner">
              {/* Hour numbers */}
              {[12, 3, 6, 9].map((num, idx) => {
                const angle = idx * 90 - 90;
                const radius = 35;
                const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

                return (
                  <div
                    key={num}
                    className="absolute text-[12px] font-semibold text-gray-600"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {num}
                  </div>
                );
              })}

              {/* Minute markers */}
              {Array.from({ length: 60 }, (_, i) => {
                const isHour = i % 5 === 0;
                const angle = i * 6 - 90;
                const innerRadius = isHour ? 42 : 44;
                const outerRadius = 48;

                const x1 = 50 + innerRadius * Math.cos((angle * Math.PI) / 180);
                const y1 = 50 + innerRadius * Math.sin((angle * Math.PI) / 180);
                const x2 = 50 + outerRadius * Math.cos((angle * Math.PI) / 180);
                const y2 = 50 + outerRadius * Math.sin((angle * Math.PI) / 180);

                return (
                  <svg
                    key={i}
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                  >
                    <line
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke={isHour ? "#374151" : "#d1d5db"}
                      strokeWidth={isHour ? "1" : "0.5"}
                    />
                  </svg>
                );
              })}

              {/* Clock Hands */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Hour Hand */}
                <div
                  className="absolute w-1 h-7 bg-gray-800 rounded-full origin-bottom transition-transform duration-1000"
                  style={{
                    // ✅ translate first, then rotate (order matters!)
                    transform: `translateX(-50%) rotate(${hour}deg)`,
                    bottom: "50%",
                    left: "50%",
                  }}
                />
                {/* Minute Hand */}
                <div
                  className="absolute w-0.5 h-10 bg-gray-600 rounded-full origin-bottom transition-transform duration-1000"
                  style={{
                    transform: `translateX(-50%) rotate(${minute}deg)`,
                    bottom: "50%",
                    left: "50%",
                  }}
                />
                {/* Second Hand */}
                <div
                  className="absolute w-0.5 h-11 bg-red-500 rounded-full origin-bottom transition-transform duration-1000"
                  style={{
                    transform: `translateX(-50%) rotate(${second}deg)`,
                    bottom: "50%",
                    left: "50%",
                  }}
                />
              </div>

              {/* Play/Pause Button Overlay */}
              <button
                onClick={handleToggle}
                className="absolute inset-0 flex items-center justify-center group"
              >
                <div
                  className={cn(
                    "size-12 rounded-full flex items-center justify-center transition-all",
                    "bg-white/80 group-hover:bg-white shadow-md group-hover:shadow-lg"
                  )}
                >
                  {isRunning ? (
                    <Pause className="h-5 w-5 text-gray-800" />
                  ) : (
                    <Play className="h-5 w-5 text-gray-800 ml-0.5" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Right Side Content */}
          <div className="flex-1 space-y-2.5">
            {/* Timer Display & Billable Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBillable && <Euro className="h-4 w-4 text-[#FF6B4A]" />}
                <div className="font-mono bg-gray-100 px-3 py-1.5 rounded-xl text-2xl font-bold tracking-tight">
                  {formatTimeDisplay(currentTime)}
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={isBillable}
                  onCheckedChange={(checked) => setIsBillable(!!checked)}
                  disabled={isRunning}
                  className="h-4 w-4 data-[state=checked]:bg-[#FF6B4A] data-[state=checked]:border-[#FF6B4A]"
                />
                <span className="text-xs text-gray-600">Billable</span>
              </label>
            </div>

            {/* Description Input */}
            <div>
              <Input
                type="text"
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-sm bg-gray-50 border-gray-200"
                disabled={isRunning}
              />
            </div>

            {/* Company & Task Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  className="min-h-9 bg-gray-50 border-gray-200"
                >
                  <Button
                    variant="outline"
                    className="h-8 justify-between text-xs px-2"
                    disabled={isRunning}
                  >
                    <span className="truncate">
                      {selectedCompany ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: selectedCompany.color || "#999",
                            }}
                          />
                          <span>{selectedCompany.name}</span>
                        </div>
                      ) : (
                        "Company"
                      )}
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedCompany(null)}>
                    <span className="text-sm">No Company</span>
                  </DropdownMenuItem>
                  {companies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: company.color || "#999" }}
                        />
                        <span className="text-sm">{company.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  className="min-h-9 bg-gray-50 border-gray-200"
                >
                  <Button
                    variant="outline"
                    className="h-8 justify-between text-xs px-2"
                    disabled={isRunning || !selectedCompany}
                  >
                    <span className="truncate">
                      {selectedTask ? selectedTask.name : "Task"}
                    </span>
                    <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedTask(null)}>
                    <span className="text-sm">No Task</span>
                  </DropdownMenuItem>
                  {tasks.map((task) => (
                    <DropdownMenuItem
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                    >
                      <span className="text-sm">{task.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TimeTrackerWidget;
