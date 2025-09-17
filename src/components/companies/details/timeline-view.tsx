// app/(dashboard)/companies/[id]/timeline/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Task } from "@/types/kanban";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDetailSlide } from "./task-detail-dialog";
import { GanttTimeline } from "@/components/timeline/gantt-timeline";

interface TimelinePageProps {
  params: { id: string };
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [params.id]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${params.id}/tasks`);
      const data = await res.json();

      // Only include tasks with dates for timeline view
      const timelineTasks = (data.tasks || []).filter(
        (task: Task) => task.startDate || task.dueDate
      );

      setTasks(timelineTasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch company assignments for assignee filter
      const res = await fetch(`/api/companies/${params.id}/assignments`);
      const data = await res.json();
      // Transform the assignments data to extract users
      const members = data.map((assignment: any) => assignment.user);
      setUsers(members || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleCreateTask = () => {
    const newTask: Partial<Task> = {
      name: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      startDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    };

    setSelectedTask(newTask as Task);
    setIsTaskDialogOpen(true);
  };

  const exportTimeline = () => {
    // TODO: Implement export functionality
    toast.info("Export feature coming soon!");
  };

  // Apply filters
  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) {
      return false;
    }
    if (filterAssignee !== "all" && task.assignedToId !== filterAssignee) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: filteredTasks.length,
    onTrack: filteredTasks.filter((t) => {
      if (!t.dueDate) return true;
      return new Date(t.dueDate) >= new Date();
    }).length,
    atRisk: filteredTasks.filter((t) => {
      if (!t.dueDate || t.status === "COMPLETED") return false;
      const daysUntilDue = Math.floor(
        (new Date(t.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDue <= 3 && daysUntilDue >= 0;
    }).length,
    overdue: filteredTasks.filter((t) => {
      if (!t.dueDate || t.status === "COMPLETED") return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B4A] mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ maxWidth: "calc(100vw - 16rem)" }}
    >
      {/* Header */}
      <div className="border-b px-6 py-2">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="REVIEW">In Review</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterStatus !== "all" || filterAssignee !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setFilterAssignee("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 p-0">
        {filteredTasks.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Settings2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tasks with dates
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add start and due dates to your tasks to see them on the
                timeline
              </p>
              <Button onClick={handleCreateTask}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task with Dates
              </Button>
            </div>
          </div>
        ) : (
          <GanttTimeline
            companyId={params.id}
            tasks={filteredTasks}
            onTaskUpdate={handleTaskUpdate}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailSlide
          task={selectedTask}
          open={isTaskDialogOpen}
          onOpenChange={(open) => {
            setIsTaskDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
              fetchTasks(); // Refresh after editing
            }
          }}
          companyId={params.id}
          onTaskUpdated={fetchTasks}
          isCreating={!selectedTask.id}
        />
      )}
    </div>
  );
}
