// components/kanban/kanban-board.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { BoardSettings, Task, ColumnConfig } from "@/types/kanban";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { KanbanSettingsPopover } from "@/components/kanban/kanban-settings";
import { TaskDetailSlide } from "./task-detail-dialog";

interface KanbanBoardProps {
  boardId: string;
  companyId: string;
  userId: string;
  userRole: string;
  searchQuery?: string;
  embedded?: boolean; // When true, board is shown within MultiBoardView
  initialSettings?: BoardSettings; // Pre-loaded settings to avoid duplicate API calls
}

export function KanbanBoard({
  boardId,
  companyId,
  userId,
  userRole = "MEMBER",
  searchQuery: externalSearchQuery = "",
  embedded = false,
  initialSettings,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<BoardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null);

  // Use external search query if embedded, otherwise use internal
  const searchQuery = embedded ? externalSearchQuery : internalSearchQuery;

  useEffect(() => {
    if (boardId) {
      if (initialSettings) {
        // Use pre-loaded settings from MultiBoardView
        console.log(`Board ${boardId} using initial settings:`, initialSettings);
        console.log(`Board ${boardId} settings type:`, typeof initialSettings);
        console.log(`Board ${boardId} has columns:`, initialSettings.columns?.length || 0);
        console.log(`Board ${boardId} columns:`, initialSettings.columns);
        setSettings(initialSettings);
        fetchTasks();
      } else {
        // Fetch settings via API (for standalone use)
        console.log(`Board ${boardId} fetching settings via API`);
        fetchBoardConfig();
        fetchTasks();
      }
    }
  }, [boardId, companyId, initialSettings]);

  const fetchBoardConfig = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch board");

      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error("Failed to fetch board config:", error);
      toast.error("Failed to load board configuration");
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Fetch tasks specific to this board
      const res = await fetch(
        `/api/companies/${companyId}/boards/${boardId}/tasks`
      );
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (columnId?: string) => {
    setIsCreatingTask(true);
    setNewTaskColumnId(columnId || "TODO");

    const newTask: Partial<Task> = {
      name: "",
      description: "",
      status: columnId || "TODO",
      priority: "MEDIUM",
      assignedToId: null,
      boardId: boardId, // Associate with current board
    };

    setSelectedTask(newTask as Task);
    setIsTaskDialogOpen(true);
  };

  const handleQuickAddTask = async (columnId: string, taskName: string) => {
    if (!taskName.trim()) {
      toast.error("Task name is required");
      return;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskName,
          status: columnId,
          priority: "MEDIUM",
          boardId: boardId, // Include boardId in the task creation
        }),
      });

      if (res.ok) {
        toast.success("Task added successfully");
        setQuickAddColumnId(null);
        await fetchTasks();
      } else {
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateSettings = async (newSettings: BoardSettings) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (res.ok) {
        setSettings(newSettings);
        toast.success("Settings saved");
        await fetchBoardConfig();
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      setIsDragging(false);

      if (!result.destination || !settings) return;

      const { source, destination, draggableId } = result;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const task = tasks.find((t) => t.id === draggableId);
      if (!task) return;

      // Check column limits
      const destColumn = settings.columns.find(
        (col) => col.id === destination.droppableId
      );
      if (destColumn?.limit) {
        const tasksInColumn = tasks.filter(
          (t) => t.status === destination.droppableId
        ).length;
        if (
          tasksInColumn >= destColumn.limit &&
          source.droppableId !== destination.droppableId
        ) {
          toast.error(
            `${destColumn.title} is at capacity (${destColumn.limit} items)`
          );
          return;
        }
      }

      // Optimistically update UI
      const newTasks = Array.from(tasks);
      const movedTask = { ...task, status: destination.droppableId };

      const updatedTasks = newTasks.map((t) => {
        if (t.id === task.id) {
          return movedTask;
        }
        return t;
      });

      setTasks(updatedTasks);

      // Update in backend
      try {
        await fetch(`/api/tasks/${draggableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: destination.droppableId,
            columnOrder: destination.index,
          }),
        });
      } catch (error) {
        console.error("Failed to update task:", error);
        toast.error("Failed to move task");
        fetchTasks(); // Revert on error
      }
    },
    [tasks, settings]
  );

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success("Task moved successfully");
        await fetchTasks();
      } else {
        throw new Error("Failed to move task");
      }
    } catch (error) {
      console.error("Failed to move task:", error);
      toast.error("Failed to move task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Task deleted successfully");
        await fetchTasks();
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!settings) return;

    try {
      const newColumns = settings.columns.filter((col) => col.id !== columnId);
      const tasksToDelete = tasks.filter((task) => task.status === columnId);

      const deletePromises = tasksToDelete.map((task) =>
        fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
        }).catch((error) => {
          console.error(`Failed to delete task ${task.id}:`, error);
        })
      );

      await Promise.all(deletePromises);

      const newSettings = {
        ...settings,
        columns: newColumns,
      };

      await handleUpdateSettings(newSettings);

      setTasks((prevTasks) =>
        prevTasks.filter((task) => task.status !== columnId)
      );

      toast.success(
        `Column "${settings.columns.find((c) => c.id === columnId)?.title}" deleted successfully`
      );
    } catch (error) {
      console.error("Failed to delete column:", error);
      toast.error("Failed to delete column");
    }
  };

  const handleEditColumn = (column: ColumnConfig) => {
    if (!settings) return;

    const existingColumn = settings.columns.find((col) => col.id === column.id);
    if (existingColumn && column.title !== existingColumn.title) {
      const newColumns = settings.columns.map((col) =>
        col.id === column.id ? { ...col, title: column.title } : col
      );

      const newSettings = {
        ...settings,
        columns: newColumns,
      };

      handleUpdateSettings(newSettings);
    }
  };

  const handleToggleColumnVisibility = async (columnId: string) => {
    if (!settings) return;

    try {
      const column = settings.columns.find((col) => col.id === columnId);
      if (!column) return;

      const newColumns = settings.columns.map((col) =>
        col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
      );

      const newSettings = {
        ...settings,
        columns: newColumns,
      };

      await handleUpdateSettings(newSettings);

      const action = column.isVisible ? "hidden" : "shown";
      toast.success(`Column "${column.title}" ${action}`);
    } catch (error) {
      console.error("Failed to toggle column visibility:", error);
      toast.error("Failed to update column visibility");
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B4A] mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading board...</p>
          {/* Debug info */}
          {!loading && !settings && (
            <p className="mt-2 text-xs text-red-500">Settings not loaded for board {boardId}</p>
          )}
        </div>
      </div>
    );
  }

  // Additional safety check for settings structure
  if (!settings.columns || settings.columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-gray-500">No columns configured for this board</p>
          <p className="mt-2 text-xs text-red-500">Board {boardId}: {settings.columns?.length || 0} columns</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col overflow-hidden ${embedded ? "" : "bg-red-500"}`}
    >
      {/* Header - Only show if not embedded */}
      {!embedded && (
        <div className="flex-shrink-0 border-b px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search tasks..."
                value={internalSearchQuery}
                onChange={(e) => setInternalSearchQuery(e.target.value)}
                className="w-64"
                prefix={<Search className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <div className="flex items-center gap-3">
              <KanbanSettingsPopover
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
              />
              <Button
                onClick={() => handleCreateTask()}
                className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Board Content */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="h-full p-4">
            <div
              className="flex h-full"
              style={{
                gap: settings.boardStyle.columnSpacing || "1rem",
                minWidth: "max-content",
              }}
            >
              {settings.columns
                .filter((col) => col.isVisible)
                .sort((a, b) => a.order - b.order)
                .map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={tasks
                      .filter(
                        (t) =>
                          t.status === column.id &&
                          (searchQuery === "" ||
                            t.name
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()))
                      )
                      .sort(
                        (a, b) => (a.columnOrder || 0) - (b.columnOrder || 0)
                      )}
                    settings={settings}
                    isDragging={isDragging}
                    onTaskClick={(task) => {
                      if (!isDragging) {
                        setSelectedTask(task);
                        setIsCreatingTask(false);
                        setIsTaskDialogOpen(true);
                      }
                    }}
                    onAddTask={() => {
                      setQuickAddColumnId(column.id);
                    }}
                    onQuickAddTask={handleQuickAddTask}
                    quickAddColumnId={quickAddColumnId}
                    onCancelQuickAdd={() => setQuickAddColumnId(null)}
                    onMoveTask={handleMoveTask}
                    onDeleteTask={handleDeleteTask}
                    onDeleteColumn={handleDeleteColumn}
                    onEditColumn={handleEditColumn}
                    onToggleColumnVisibility={handleToggleColumnVisibility}
                  />
                ))}
            </div>
          </div>
        </div>
      </DragDropContext>

      {(selectedTask || isCreatingTask) && (
        <TaskDetailSlide
          task={selectedTask}
          open={isTaskDialogOpen}
          onOpenChange={(open) => {
            setIsTaskDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
              setIsCreatingTask(false);
              setNewTaskColumnId(null);
            }
          }}
          companyId={companyId}
          boardId={boardId}
          onTaskUpdated={fetchTasks}
          isCreating={isCreatingTask}
          initialStatus={newTaskColumnId}
        />
      )}
    </div>
  );
}
