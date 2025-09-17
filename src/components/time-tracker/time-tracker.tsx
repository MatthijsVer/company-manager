// components/time-tracker/time-tracker.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Square,
  ChevronsUpDown,
  Check,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

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
  companyId: string | null;
  taskId: string | null;
  startTime: string;
  endTime: string | null;
  duration: number;
  isRunning: boolean;
  isInternal: boolean;
  isBillable: boolean;
}

interface TimeTrackerPopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TimeTrackerPopover({
  children,
  open,
  onOpenChange,
}: TimeTrackerPopoverProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [description, setDescription] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isBillable, setIsBillable] = useState(true);
  const [openCompanyCombo, setOpenCompanyCombo] = useState(false);
  const [openTaskCombo, setOpenTaskCombo] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [currentRunningId, setCurrentRunningId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch time entries
  useEffect(() => {
    fetchTimeEntries();
  }, [selectedDate]);

  // Check for running timer on mount
  useEffect(() => {
    checkRunningTimer();
  }, []);

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Fetch tasks when company changes
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
      const res = await fetch("/api/companies?limit=50");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      toast.error("Failed to load companies");
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
      const date = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch(`/api/time-entries?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both { entries: [...] } and direct array responses
        const entries = data.entries || data;
        // Ensure it's always an array
        setTodayEntries(Array.isArray(entries) ? entries : []);
      }
    } catch (error) {
      console.error("Failed to fetch time entries:", error);
      toast.error("Failed to load time entries");
      setTodayEntries([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const checkRunningTimer = async () => {
    try {
      const res = await fetch("/api/time-entries?isRunning=true");
      if (res.ok) {
        const data = await res.json();
        // Handle both { entries: [...] } and direct array responses
        const entries = data.entries || data;
        const entriesArray = Array.isArray(entries) ? entries : [];

        if (entriesArray.length > 0) {
          const running = entriesArray[0];
          setCurrentRunningId(running.id);
          setIsRunning(true);
          setDescription(running.description);
          setSelectedCompany(running.company);
          setSelectedTask(running.task);
          setIsInternal(running.isInternal);
          setIsBillable(running.isBillable);

          // Calculate elapsed time
          const elapsed = Math.floor(
            (Date.now() - new Date(running.startTime).getTime()) / 1000
          );
          setTime(elapsed);
        }
      }
    } catch (error) {
      console.error("Failed to check running timer:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description || "Untitled",
          companyId: selectedCompany?.id,
          taskId: selectedTask?.id,
          isRunning: true,
          isInternal,
          isBillable,
        }),
      });

      if (res.ok) {
        const entry = await res.json();
        setCurrentRunningId(entry.id);
        setIsRunning(true);
        toast.success("Timer started");
        fetchTimeEntries();
      } else {
        toast.error("Failed to start timer");
      }
    } catch (error) {
      console.error("Failed to start timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handleStop = async () => {
    if (!currentRunningId) return;

    try {
      const res = await fetch("/api/time-entries/stop", {
        method: "POST",
      });

      if (res.ok) {
        setIsRunning(false);
        setTime(0);
        setDescription("");
        setSelectedCompany(null);
        setSelectedTask(null);
        setIsInternal(false);
        setIsBillable(true);
        setCurrentRunningId(null);
        toast.success("Timer stopped");
        fetchTimeEntries();
      } else {
        toast.error("Failed to stop timer");
      }
    } catch (error) {
      console.error("Failed to stop timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Entry deleted");
        fetchTimeEntries();
      } else {
        toast.error("Failed to delete entry");
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      const res = await fetch(`/api/time-entries/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editingEntry.description,
          companyId: editingEntry.companyId,
          taskId: editingEntry.taskId,
          duration: editingEntry.duration,
          isInternal: editingEntry.isInternal,
          isBillable: editingEntry.isBillable,
        }),
      });

      if (res.ok) {
        toast.success("Entry updated");
        setEditingEntry(null);
        fetchTimeEntries();
      } else {
        toast.error("Failed to update entry");
      }
    } catch (error) {
      console.error("Failed to update entry:", error);
      toast.error("Failed to update entry");
    }
  };

  const todayTotal =
    (Array.isArray(todayEntries) ? todayEntries : []).reduce(
      (acc, entry) => acc + entry.duration,
      0
    ) + (isRunning ? time : 0);

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-96 p-4 ml-3 mb-2 shadow-none rounded-2xl"
          align="end"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-4">
            {/* Header with Date Selector */}
            <div className="flex items-center justify-between pb-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {format(selectedDate, "EEEE, d MMMM", { locale: nl })}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Totaal: {formatTime(todayTotal)}
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center">
              <div className="font-mono text-3xl font-bold mb-2">
                {formatTime(time)}
              </div>
            </div>

            {/* Description Input */}
            <Input
              type="text"
              placeholder="Waar werk je aan?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full"
              disabled={isRunning}
            />

            {/* Company and Task Selectors */}
            <div className="flex gap-2">
              {/* Company Combobox */}
              <Popover
                open={openCompanyCombo}
                onOpenChange={setOpenCompanyCombo}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    size="sm"
                    className="flex-1 justify-between"
                    disabled={isRunning}
                  >
                    {selectedCompany ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="size-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: selectedCompany.color || "#999",
                          }}
                        />
                        <span className="text-xs truncate">
                          {selectedCompany.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Selecteer bedrijf
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Zoek bedrijf..."
                      className="h-9"
                    />
                    <CommandEmpty>Geen bedrijf gevonden.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[120px]">
                        {companies.map((company) => (
                          <CommandItem
                            key={company.id}
                            value={company.name}
                            onSelect={() => {
                              setSelectedCompany(company);
                              setSelectedTask(null);
                              setOpenCompanyCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCompany?.id === company.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div
                              className="size-2 rounded-full mr-2"
                              style={{
                                backgroundColor: company.color || "#999",
                              }}
                            />
                            <span className="text-xs">{company.name}</span>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Task Combobox */}
              <Popover open={openTaskCombo} onOpenChange={setOpenTaskCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    size="sm"
                    className="flex-1 justify-between"
                    disabled={!selectedCompany || isRunning}
                  >
                    {selectedTask ? (
                      <span className="text-xs truncate">
                        {selectedTask.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Taak (optioneel)
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Zoek taak..." className="h-9" />
                    <CommandEmpty>Geen taak gevonden.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[200px]">
                        {tasks.map((task) => (
                          <CommandItem
                            key={task.id}
                            value={task.name}
                            onSelect={() => {
                              setSelectedTask(task);
                              setOpenTaskCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTask?.id === task.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="text-xs">{task.name}</span>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal"
                  checked={isInternal}
                  onCheckedChange={(checked) =>
                    setIsInternal(checked as boolean)
                  }
                  disabled={isRunning}
                />
                <label
                  htmlFor="internal"
                  className="text-sm font-medium leading-none"
                >
                  Intern
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="billable"
                  checked={isBillable}
                  onCheckedChange={(checked) =>
                    setIsBillable(checked as boolean)
                  }
                  disabled={isRunning}
                />
                <label
                  htmlFor="billable"
                  className="text-sm font-medium leading-none"
                >
                  Factureerbaar
                </label>
              </div>
            </div>

            {/* Start/Stop Button */}
            <Button
              onClick={isRunning ? handleStop : handleStart}
              className={cn(
                "w-full",
                isRunning
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-[#FF6B4A] hover:bg-[#FF6B4A]/80"
              )}
            >
              {isRunning ? (
                <>
                  <Square className="size-4 mr-2" />
                  Stop Timer
                </>
              ) : (
                <>
                  <Play className="size-4 mr-2" />
                  Start Timer
                </>
              )}
            </Button>

            {/* Recent Entries */}
            {todayEntries.length > 0 && (
              <div className="border-t pt-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  VANDAAG
                </div>
                <ScrollArea className="h-[200px]">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs py-2 px-1 hover:bg-muted/50 rounded group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {entry.company && (
                          <div
                            className="size-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: entry.company.color || "#999",
                            }}
                          />
                        )}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate font-medium">
                            {entry.description}
                          </span>
                          {entry.company && (
                            <span className="text-[10px] text-muted-foreground">
                              {entry.company.name}
                              {entry.task && ` • ${entry.task.name}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-muted-foreground">
                          {formatTime(entry.duration)}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bewerk tijd entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-description">Beschrijving</Label>
                <Input
                  id="edit-description"
                  value={editingEntry.description}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-duration">Duur (in seconden)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editingEntry.duration}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {formatTime(editingEntry.duration)}
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-internal"
                    checked={editingEntry.isInternal}
                    onCheckedChange={(checked) =>
                      setEditingEntry({
                        ...editingEntry,
                        isInternal: checked as boolean,
                      })
                    }
                  />
                  <label htmlFor="edit-internal" className="text-sm">
                    Intern
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-billable"
                    checked={editingEntry.isBillable}
                    onCheckedChange={(checked) =>
                      setEditingEntry({
                        ...editingEntry,
                        isBillable: checked as boolean,
                      })
                    }
                  />
                  <label htmlFor="edit-billable" className="text-sm">
                    Factureerbaar
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Annuleren
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
