"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowDown,
  Minus,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  Grid3x3,
  List,
  Filter,
  UserCheck,
  Star,
  Copy,
  Archive,
  Download,
  Upload,
  ClipboardClock,
  ListTodo,
  ClockAlert,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TaskDetailSlide } from "./task-detail-dialog";
import { QuickAddTask } from "./quick-add-task";

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  dueDate?: string;
  estimatedHours?: number;
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

interface CompanyTasksProps {
  companyId: string;
  session?: any;
}

export function CompanyTasks({ companyId, session }: CompanyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  useEffect(() => {
    fetchTasks();
  }, [companyId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "TODO":
        return <ListTodo className="h-3.5 w-3.5 text-gray-400" />;
      case "IN_PROGRESS":
        return <AlertCircle className="h-3.5 w-3.5 text-blue-500" />;
      case "REVIEW":
        return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

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
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned"
        ? !task.assignedTo
        : task.assignedTo?.id === assigneeFilter);

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  // Stats
  const todoCount = tasks.filter((t) => t.status === "TODO").length;
  const inProgressCount = tasks.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const overdueCount = tasks.filter(
    (t) =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "COMPLETED"
  ).length;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <div className="grid px-3 grid-cols-4 gap-4 border-b">
          <div className="px-4 border-r py-1.5">
            <div className="flex items-center">
              <ListTodo className="h-4 mr-2 w-4 text-gray-600" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {todoCount}
              </p>
              <p className="text-sm text-gray-500">Open tasks</p>
            </div>
          </div>

          <div className="px-4 py-1.5 border-r">
            <div className="flex items-center">
              <AlertCircle className="h-4 mr-2 w-4 text-blue-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {inProgressCount}
              </p>
              <p className="text-sm text-gray-500">Tasks in progress</p>
            </div>
          </div>

          <div className="px-4 py-1.5 border-r">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 mr-2 w-4 text-green-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {completedCount}
              </p>
              <p className="text-sm text-gray-500">Tasks completed</p>
            </div>
          </div>

          <div className="px-4 py-1.5">
            <div className="flex items-center">
              <ClockAlert className="h-4 mr-2 w-4 text-red-400" />
              <p className="text-base mr-2 font-bold text-gray-900">
                {overdueCount}
              </p>
              <p className="text-sm text-gray-500">Tasks overdue</p>
            </div>
          </div>
        </div>
        <div className="p-6 ">
          {/* Tasks Display */}
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskDialogOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <Badge
                        className={cn("text-xs", getStatusColor(task.status))}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Task
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Copy className="h-3 w-3 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Archive className="h-3 w-3 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 cursor-pointer">
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                    {task.name}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    {getPriorityIcon(task.priority)}
                    <Badge
                      className={cn("text-xs", getPriorityColor(task.priority))}
                    >
                      {task.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assignedTo.image} />
                          <AvatarFallback className="bg-[#222222] text-white text-[10px]">
                            {task.assignedTo.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-600 truncate max-w-[100px]">
                          {task.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Unassigned</span>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-4 w-12">
                        <Checkbox
                          checked={
                            selectedTasks.size === filteredTasks.length &&
                            filteredTasks.length > 0
                          }
                          onCheckedChange={selectAllTasks}
                        />
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Assignee
                      </th>
                      <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task, index) => (
                      <tr
                        key={task.id}
                        className={cn(
                          "group hover:bg-gray-50 cursor-pointer transition-colors",
                          index !== filteredTasks.length - 1 &&
                            "border-b border-gray-100"
                        )}
                        onClick={() => {
                          setSelectedTask(task);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <td
                          className="p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedTasks.has(task.id)}
                            onCheckedChange={() => toggleTaskSelection(task.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {task.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            className={cn(
                              "text-xs",
                              getStatusColor(task.status)
                            )}
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(task.priority)}
                            <Badge
                              className={cn(
                                "text-xs",
                                getPriorityColor(task.priority)
                              )}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          {task.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={task.assignedTo.image} />
                                <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px] font-medium">
                                  {task.assignedTo.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-700">
                                {task.assignedTo.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {task.dueDate ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {format(new Date(task.dueDate), "MMM d, yyyy")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              No due date
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="h-3.5 w-3.5 mr-2" />
                                Edit Task
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <Archive className="h-3.5 w-3.5 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 cursor-pointer">
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l h-full flex flex-col">
        <div className="p-4 border-b w-full">
          <Button
            onClick={() => setIsQuickAddOpen(true)}
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

        {/* View Toggle */}
        <div className="space-y-4 p-4 border-b">
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              View Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTasks.size > 0 && (
          <div className="space-y-3 p-4 border-b">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Bulk Actions ({selectedTasks.size} selected)
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Edit className="h-3.5 w-3.5 mr-2" />
                Edit Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Archive className="h-3.5 w-3.5 mr-2" />
                Archive Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3 p-4 border-b">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <Download className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Export Tasks
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

      {/* Quick Add Task */}
      <QuickAddTask
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        companyId={companyId}
        onTaskCreated={fetchTasks}
      />

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailSlide
          task={selectedTask}
          open={isTaskDialogOpen}
          onOpenChange={setIsTaskDialogOpen}
          companyId={companyId}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
