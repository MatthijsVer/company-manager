import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as LabelComponent } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Clock,
  CalendarIcon,
  User,
  MessageSquare,
  Paperclip,
  Send,
  Edit2,
  Check,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowDown,
  Minus,
  Upload,
  FileText,
  Download,
  CheckCheck,
  MessageCircle,
  UserRound,
  ChevronsUp,
  MoreVertical,
  Trash2,
  List,
  X,
  Plus,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Task, Label } from "@/types/kanban";
import { LabelManager } from "@/components/kanban/label-manager";
import { TaskLabels } from "@/components/kanban/task-label";

interface TaskDetailSlideProps {
  task: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onTaskUpdated?: () => void;
  isCreating?: boolean;
  initialStatus?: string | null;
}

export function TaskDetailSlide({
  task,
  open,
  onOpenChange,
  companyId,
  onTaskUpdated,
  isCreating = false,
  initialStatus,
}: TaskDetailSlideProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    assignedToId: "unassigned",
    startDate: null as Date | null,
    dueDate: null as Date | null,
    estimatedHours: "",
    labels: [] as Label[],
  });

  useEffect(() => {
    if (open) {
      if (isCreating) {
        // Creating a new task
        setMode("edit");
        setFormData({
          name: "",
          description: "",
          status: initialStatus || "TODO",
          priority: "MEDIUM",
          assignedToId: "unassigned",
          startDate: null,
          dueDate: null,
          estimatedHours: "",
          labels: [],
        });
        setComments([]);
        setAttachments([]);
      } else if (task) {
        // Editing existing task
        setMode("view");
        setFormData({
          name: task.name || "",
          description: task.description || "",
          status: task.status || "TODO",
          priority: task.priority || "MEDIUM",
          assignedToId: task.assignedToId || "unassigned",
          startDate: task.startDate ? new Date(task.startDate) : null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          estimatedHours: task.estimatedHours?.toString() || "",
          labels: task.labels || [],
        });
        fetchTaskDetails();
      }
      fetchUsers();
    }
  }, [task, open, isCreating, initialStatus]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchTaskDetails = async () => {
    if (!task?.id) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`);
      if (res.ok) {
        const fullTask = await res.json();
        setComments(fullTask.comments || []);
        setAttachments(fullTask.attachments || []);
      }
    } catch (error) {
      console.error("Failed to fetch task details:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Task name is required");
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        assignedToId:
          formData.assignedToId === "unassigned" ? null : formData.assignedToId,
        estimatedHours: formData.estimatedHours
          ? parseFloat(formData.estimatedHours)
          : null,
      };

      if (isCreating) {
        // Create new task
        const res = await fetch(`/api/companies/${companyId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });

        if (res.ok) {
          toast.success("Task created successfully");
          onTaskUpdated?.();
          onOpenChange(false);
        } else {
          throw new Error("Failed to create task");
        }
      } else {
        // Update existing task
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });

        if (res.ok) {
          toast.success("Task updated successfully");
          onTaskUpdated?.();
          setMode("view");
        } else {
          throw new Error("Failed to update task");
        }
      }
    } catch (error) {
      console.error("Failed to save task:", error);
      toast.error(
        isCreating ? "Failed to create task" : "Failed to update task"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task?.id || isCreating) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const comment = await res.json();
        setComments([comment, ...comments]);
        setNewComment("");
        toast.success("Comment added");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task?.id || isCreating) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const attachment = await res.json();
        setAttachments([...attachments, attachment]);
        toast.success("File uploaded successfully");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "TODO":
        return <List className="h-4 w-4 text-gray-400" />;
      case "IN_PROGRESS":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "REVIEW":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <List className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <ChevronsUp className="h-4 w-4 text-red-500" />;
      case "HIGH":
        return <ArrowUp className="h-4 w-4 text-orange-500" />;
      case "MEDIUM":
        return <Minus className="h-4 w-4 text-yellow-500" />;
      case "LOW":
        return <ArrowDown className="h-4 w-4 text-gray-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "LOW":
        return "bg-gray-100 text-gray-500 border-gray-200";
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  const isEditMode = mode === "edit";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[540px] right-4 h-[97vh] rounded-xl mt-4 sm:max-w-xl p-0 [&>button]:hidden">
        <SheetHeader className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isCreating ? (
                  <>
                    <Plus className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">
                      New Task
                    </span>
                  </>
                ) : (
                  <>
                    {getStatusIcon(formData.status)}
                    <span className="text-sm font-medium text-gray-500">
                      TASK-{task?.id?.slice(-6).toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {mode === "view" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMode("edit")}
                    className="rounded-lg"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#FF6B4A] rounded-lg hover:bg-[#FF6B4A]/90"
                    onClick={() => {
                      setFormData({ ...formData, status: "COMPLETED" });
                      handleSubmit();
                    }}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Done
                  </Button>
                  <SheetClose className="h-8 border rounded-lg flex items-center justify-center aspect-square max-w-8">
                    <X className="size-3.5" />
                  </SheetClose>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (isCreating) {
                        onOpenChange(false);
                      } else {
                        setMode("view");
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
                  >
                    {loading ? "Saving..." : isCreating ? "Create" : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <SheetTitle className="sr-only">
            {isCreating ? "Create New Task" : "Task Details"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {isCreating ? "Create a new task" : "View and edit task details"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-0">
          {/* Task Title */}
          {isEditMode ? (
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter task name..."
              className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
              autoFocus={isCreating}
            />
          ) : (
            <h2 className="text-lg font-semibold">
              {formData.name || "Untitled Task"}
            </h2>
          )}

          {/* Quick Info - Only show if not creating */}
          {!isCreating && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              <Badge className={cn("text-xs", getStatusColor(formData.status))}>
                {formData.status.replace("_", " ")}
              </Badge>
              <span>•</span>
              <div className="flex items-center gap-1">
                {getPriorityIcon(formData.priority)}
                <span className="text-gray-600">{formData.priority}</span>
              </div>
              {formData.dueDate && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-gray-600">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{format(formData.dueDate, "MMM d")}</span>
                  </div>
                </>
              )}
              {task?.assignedTo && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignedTo.image} />
                      <AvatarFallback className="text-[9px] bg-[#1F1F1F] text-white">
                        {task.assignedTo.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-gray-600 text-sm">
                      {task.assignedTo.name}
                    </span>
                  </div>
                </>
              )}
              {!isCreating && formData.labels.length > 0 && (
                <div className="mt-3">
                  <TaskLabels
                    labels={formData.labels}
                    maxVisible={3}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 mt-2">
          <ScrollArea className="h-[calc(100vh-205px)] rounded-b-xl">
            <div className="p-6 pt-0 space-y-6 mt-0">
              {/* Description */}
              <div>
                <LabelComponent className="text-sm font-medium mb-2 block">
                  Description
                </LabelComponent>
                {isEditMode ? (
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Add description..."
                    rows={4}
                    className="resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {formData.description || "No description provided"}
                  </p>
                )}
              </div>

              <Separator />

              {/* Fields Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Status
                  </LabelComponent>
                  {isEditMode ? (
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      className={cn("text-xs", getStatusColor(formData.status))}
                    >
                      {formData.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Priority
                  </LabelComponent>
                  {isEditMode ? (
                    <Select
                      value={formData.priority}
                      onValueChange={(value) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(formData.priority)}
                      <Badge
                        className={cn(
                          "text-xs",
                          getPriorityColor(formData.priority)
                        )}
                      >
                        {formData.priority}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Assignee
                  </LabelComponent>
                  {isEditMode ? (
                    <Select
                      value={formData.assignedToId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, assignedToId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user.image} />
                                <AvatarFallback className="text-[10px]">
                                  {user.name?.charAt(0) || user.email.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.name || user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      {formData.assignedToId !== "unassigned" &&
                      users.find((u) => u.id === formData.assignedToId) ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={
                                users.find(
                                  (u) => u.id === formData.assignedToId
                                )?.image
                              }
                            />
                            <AvatarFallback className="text-[10px] bg-[#1F1F1F] text-white">
                              {users
                                .find((u) => u.id === formData.assignedToId)
                                ?.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {
                              users.find((u) => u.id === formData.assignedToId)
                                ?.name
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Due Date
                  </LabelComponent>
                  {isEditMode ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate
                            ? format(formData.dueDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate || undefined}
                          onSelect={(date) =>
                            setFormData({ ...formData, dueDate: date || null })
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {formData.dueDate
                        ? format(formData.dueDate, "PPP")
                        : "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Start Date
                  </LabelComponent>
                  {isEditMode ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate
                            ? format(formData.startDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.startDate || undefined}
                          onSelect={(date) =>
                            setFormData({
                              ...formData,
                              startDate: date || null,
                            })
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {formData.startDate
                        ? format(formData.startDate, "PPP")
                        : "Not set"}
                    </p>
                  )}
                </div>

                <div>
                  <LabelComponent className="text-sm font-medium mb-2 block">
                    Estimated Hours
                  </LabelComponent>
                  {isEditMode ? (
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.estimatedHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimatedHours: e.target.value,
                        })
                      }
                      placeholder="Enter hours"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {formData.estimatedHours
                        ? `${formData.estimatedHours} hours`
                        : "Not estimated"}
                    </p>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div>
                <LabelComponent className="text-sm font-medium mb-3 block">
                  Labels
                </LabelComponent>
                {isEditMode ? (
                  <LabelManager
                    selectedLabels={formData.labels}
                    onLabelsChange={(labels) =>
                      setFormData({ ...formData, labels })
                    }
                    availableLabels={[]}
                  />
                ) : (
                  <div className="space-y-2">
                    {formData.labels.length > 0 ? (
                      <TaskLabels
                        labels={formData.labels}
                        maxVisible={5}
                        size="md"
                      />
                    ) : (
                      <p className="text-sm text-gray-600">
                        No labels assigned
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Only show timestamps if not creating */}
              {!isCreating && task?.createdAt && (
                <div className="text-xs text-gray-500 bg-gray-100 rounded-lg flex items-center justify-center py-1.5">
                  Created {format(new Date(task.createdAt), "PPP")} • Updated{" "}
                  {formatDistanceToNow(new Date(task.updatedAt))} ago
                </div>
              )}
            </div>

            {/* Only show comments and attachments for existing tasks */}
            {!isCreating && task?.id && (
              <>
                <Separator />

                <div className="p-6 mt-0">
                  <p className="text-sm font-semibold mb-4 text-gray-400">
                    COMMENTS
                  </p>
                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <div className="text-center py-12 bg-gray-100 rounded-lg">
                        <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No comments yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Be the first to comment on this task
                        </p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user?.image} />
                            <AvatarFallback className="text-xs bg-[#1F1F1F] text-white">
                              {comment.user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {comment.user?.name || "Unknown User"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(comment.createdAt)
                                  )}{" "}
                                  ago
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-[#FF6B4A] text-white">
                        <UserRound className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex gap-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                        className="flex-1 shadow-none min-h-[110px] resize-none"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="bg-[#FF6B4A] rounded-full size-10 hover:bg-[#FF6B4A]/90"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="p-6 mt-0">
                  <p className="text-sm font-semibold mb-4 text-gray-400">
                    ATTACHMENTS
                  </p>

                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                    id="file-upload"
                  />
                  <LabelComponent
                    htmlFor="file-upload"
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                      uploadingFile && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {uploadingFile ? "Uploading..." : "Click to upload files"}
                    </span>
                  </LabelComponent>

                  <div className="mt-6 space-y-2">
                    {attachments.length === 0 ? (
                      <div className="text-center py-12 bg-gray-100 rounded-lg">
                        <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No attachments</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Upload files to share with your team
                        </p>
                      </div>
                    ) : (
                      attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {attachment.fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Uploaded by {attachment.user?.name || "Unknown"}{" "}
                                •
                                {formatDistanceToNow(
                                  new Date(attachment.createdAt)
                                )}{" "}
                                ago
                              </p>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              window.open(attachment.fileUrl, "_blank")
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
