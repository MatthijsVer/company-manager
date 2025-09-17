"use client";

import { useState, useRef, useEffect } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Paperclip,
  Clock,
  Minus,
  Circle,
  AlertCircle,
  CheckCircle2,
  MoveRight,
  Trash2,
  Edit2,
  List,
  Eye,
  EyeOff,
  Settings,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  MessageCircle,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { BoardSettings, Task, ColumnConfig } from "@/types/kanban";
import { TaskLabels } from "./task-label";

interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  settings: BoardSettings;
  isDragging?: boolean;
  onTaskClick: (task: Task) => void;
  onMoveTask?: (taskId: string, newStatus: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddTask?: () => void;
  onQuickAddTask?: (columnId: string, taskName: string) => void;
  quickAddColumnId?: string | null;
  onCancelQuickAdd?: () => void;
  onDeleteColumn?: (columnId: string) => void;
  onEditColumn?: (column: ColumnConfig) => void;
  onToggleColumnVisibility?: (columnId: string) => void;
  onMoveColumn?: (columnId: string, direction: "left" | "right") => void;
  totalColumns: number;
  columnIndex: number;
  dragHandleProps?: any;
}

const ICON_MAP: { [key: string]: any } = {
  circle: List,
  "alert-circle": AlertCircle,
  clock: Clock,
  "check-circle": CheckCircle2,
};

export function KanbanColumn({
  column,
  tasks,
  settings,
  isDragging = false,
  onTaskClick,
  onMoveTask,
  onDeleteTask,
  onAddTask,
  onQuickAddTask,
  quickAddColumnId,
  onCancelQuickAdd,
  onDeleteColumn,
  onEditColumn,
  onToggleColumnVisibility,
  onMoveColumn,
  totalColumns,
  columnIndex,
  dragHandleProps,
}: KanbanColumnProps) {
  const [localDragging, setLocalDragging] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [quickTaskName, setQuickTaskName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isQuickAddActive = quickAddColumnId === column.id;

  useEffect(() => {
    if (isQuickAddActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isQuickAddActive]);

  useEffect(() => {
    setEditedTitle(column.title);
  }, [column.title]);

  const handleQuickSubmit = async () => {
    if (!quickTaskName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onQuickAddTask?.(column.id, quickTaskName);
    setQuickTaskName("");
    setIsSubmitting(false);
  };

  const handleQuickCancel = () => {
    setQuickTaskName("");
    onCancelQuickAdd?.();
  };

  const getStatusIcon = (iconName?: string) => {
    const IconComponent = iconName ? ICON_MAP[iconName] : Circle;
    return IconComponent ? <IconComponent className="h-3.5 w-3.5" /> : null;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <ChevronsUp className="h-3 w-3 text-red-500" />;
      case "HIGH":
        return <ChevronUp className="h-3 w-3 text-orange-500" />;
      case "MEDIUM":
        return <Minus className="h-3 w-3 text-yellow-500" />;
      case "LOW":
        return <ChevronDown className="h-3 w-3 text-gray-400" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
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

  const handleDeleteColumn = () => {
    if (tasks.length > 0) {
      setShowDeleteDialog(true);
    } else {
      onDeleteColumn?.(column.id);
    }
  };

  const handleStartEditTitle = () => {
    setIsEditingTitle(true);
    setEditedTitle(column.title);
    setTimeout(() => {
      titleInputRef.current?.select();
    }, 0);
  };

  const handleSaveTitle = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== column.title) {
      onEditColumn?.({ ...column, title: trimmedTitle });
    } else {
      setEditedTitle(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setEditedTitle(column.title);
    setIsEditingTitle(false);
  };

  const columnWidth = settings.boardStyle.compactMode ? "w-55" : "w-67";

  return (
    <>
      <div className={cn("flex flex-col", columnWidth)}>
        {/* Column Header */}
        <div className="mb-3">
          <div
            className={cn(
              "flex items-center justify-between mb-2",
              isEditingTitle ? "" : "cursor-grab active:cursor-grabbing"
            )}
            {...(isEditingTitle ? {} : dragHandleProps)}
          >
            <div className="flex items-center gap-2 px-2">
              {/* <div>{getStatusIcon(column.icon)}</div> */}
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveTitle();
                    } else if (e.key === "Escape") {
                      handleCancelEditTitle();
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 px-2 py-0 text-sm font-semibold w-32"
                />
              ) : (
                <h3
                  className="font-semibold text-sm cursor-text hover:text-[#FF6B4A]"
                  onDoubleClick={handleStartEditTitle}
                >
                  {column.title}
                </h3>
              )}
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-0">
              {/* Column Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onMoveColumn?.(column.id, "left")}
                    disabled={columnIndex === 0}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-2" />
                    Move left
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => onMoveColumn?.(column.id, "right")}
                    disabled={columnIndex === totalColumns - 1}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    Move right
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDeleteColumn}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="ghost"
                onClick={onAddTask}
                className="h-7 w-7 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Column Tasks */}
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden px-1",
                "min-h-[100px] rounded-lg transition-colors"
              )}
              style={{
                maxHeight: "calc(100vh - 200px)",
              }}
            >
              <div className="space-y-2 pb-2">
                {/* Quick Add Input - Shows at the top when active */}
                {isQuickAddActive && (
                  <div className="bg-white p-3 rounded-xl">
                    <Input
                      ref={inputRef}
                      value={quickTaskName}
                      onChange={(e) => setQuickTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickSubmit();
                        } else if (e.key === "Escape") {
                          handleQuickCancel();
                        }
                      }}
                      placeholder="Enter task name..."
                      className="mb-2 border-gray-200 focus:border-[#FF6B4A] focus:ring-[#FF6B4A]/20"
                      disabled={isSubmitting}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleQuickCancel}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleQuickSubmit}
                        disabled={!quickTaskName.trim() || isSubmitting}
                        className="flex-1 bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isSubmitting ? "Adding..." : "Add Task"}
                      </Button>
                    </div>
                  </div>
                )}

                {tasks.map((task, index) => (
                  <Draggable
                    key={task.id}
                    draggableId={task.id}
                    index={index}
                    disableInteractiveElementBlocking
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          borderRadius: settings.cardStyle.borderRadius,
                        }}
                        onMouseDown={() => setLocalDragging(true)}
                        onMouseUp={() => {
                          setTimeout(() => setLocalDragging(false), 100);
                        }}
                        onClick={(e) => {
                          if (!localDragging && !isDragging) {
                            onTaskClick(task);
                          }
                        }}
                        className={cn(
                          "bg-white p-4 select-none",
                          "transition-all duration-200 ease-in-out",
                          "cursor-grab active:cursor-grabbing",
                          snapshot.isDragging && "opacity-90",
                          settings.cardStyle.cardHeight === "compact" && "p-2"
                        )}
                      >
                        {/* Task Priority Badge */}
                        {settings.cardStyle.showPriority && (
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
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
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskClick(task);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs">
                                  Move to
                                </DropdownMenuLabel>
                                {settings.columns
                                  .filter(
                                    (col) =>
                                      col.id !== task.status && col.isVisible
                                  )
                                  .map((col) => (
                                    <DropdownMenuItem
                                      key={col.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onMoveTask?.(task.id, col.id);
                                      }}
                                    >
                                      <MoveRight className="h-3 w-3 mr-2" />
                                      {col.title}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask?.(task.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        {/* Task Title */}
                        <h4
                          className={cn(
                            "font-medium mb-1 line-clamp-2",
                            settings.cardStyle.cardHeight === "compact"
                              ? "text-xs"
                              : "text-sm"
                          )}
                        >
                          {task.name}
                        </h4>

                        {/* Task Description */}
                        {settings.cardStyle.showDescription &&
                          task.description &&
                          settings.cardStyle.cardHeight !== "compact" && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                        {/* Task Labels */}
                        {settings.cardStyle.showLabels !== false &&
                          task.labels &&
                          task.labels.length > 0 && (
                            <div className="mb-2 mt-2">
                              <TaskLabels
                                labels={task.labels}
                                maxVisible={
                                  settings.cardStyle.cardHeight === "compact"
                                    ? 2
                                    : 3
                                }
                                size={
                                  settings.cardStyle.cardHeight === "compact"
                                    ? "sm"
                                    : "sm"
                                }
                              />
                            </div>
                          )}

                        {/* Task Footer */}
                        {settings.cardStyle.cardHeight !== "compact" && (
                          <div className="flex items-center justify-between mt-3 pt-2">
                            <div className="flex items-center gap-3">
                              {/* Due Date */}
                              {settings.cardStyle.showDueDate &&
                                task.dueDate && (
                                  <>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500">
                                        {format(
                                          new Date(task.startDate),
                                          "MMM d"
                                        )}
                                      </span>
                                    </div>
                                    <ChevronRight className="size-3.5 -mx-1" />
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500">
                                        {format(
                                          new Date(task.dueDate),
                                          "MMM d"
                                        )}
                                      </span>
                                    </div>
                                  </>
                                )}

                              <div className="flex items-center gap-2">
                                {settings.cardStyle.showComments &&
                                  (task._count?.comments ?? 0) > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      <MessageCircle className="h-3 w-3 text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500">
                                        {task?._count?.comments}
                                      </span>
                                    </div>
                                  )}

                                {settings.cardStyle.showAttachments &&
                                  (task._count?.attachments ?? 0) > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      <Paperclip className="h-3 w-3 text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500">
                                        {task?._count?.attachments}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>

                            {/* Assignee */}
                            {settings.cardStyle.showAssignee &&
                              (task.assignedTo ? (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={task.assignedTo.image} />
                                  <AvatarFallback className="text-[10px] bg-[#222222] text-white">
                                    {task.assignedTo.name?.charAt(0) ||
                                      task.assignedTo.email?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-6 w-6 rounded-full border bg-gray-50 border-dashed border-gray-300" />
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}

                {tasks.length === 0 &&
                  settings.boardStyle.showEmptyMessage &&
                  !isQuickAddActive && (
                    <div className="text-center text-gray-400 bg-white rounded-2xl p-4">
                      <p className="text-sm mb-2 bg-gray-100 h-20 flex items-center justify-center rounded-lg">
                        No tasks
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAddTask}
                        className="text-xs hover:bg-transparent"
                      >
                        <Plus className="h-3 w-3" />
                        Add task
                      </Button>
                    </div>
                  )}
              </div>

              {/* Add Task Button - Hidden when quick add is active */}
              {tasks.length > 0 && !isQuickAddActive && (
                <Button
                  onClick={onAddTask}
                  className="w-full mt-1 bg-[#222222] hover:bg-[#222222]/90 rounded-full"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add task
                </Button>
              )}
            </div>
          )}
        </Droppable>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{column.title}" column?</AlertDialogTitle>
            <AlertDialogDescription>
              This column contains {tasks.length} task
              {tasks.length !== 1 ? "s" : ""}. All tasks in this column will be
              permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteColumn?.(column.id);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
