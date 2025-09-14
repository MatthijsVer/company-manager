"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Columns } from "lucide-react";
import { toast } from "sonner";

interface AddColumnPopoverProps {
  boardId: string;
  boardName: string;
  onColumnAdded: () => void;
}

export function AddColumnPopover({
  boardId,
  boardName,
  onColumnAdded,
}: AddColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddColumn = async () => {
    if (!columnTitle.trim()) {
      toast.error("Column title is required");
      return;
    }

    try {
      setIsAdding(true);
      
      // Fetch current board settings
      const boardRes = await fetch(`/api/boards/${boardId}`);
      const board = await boardRes.json();
      
      if (!board.settings || !board.settings.columns) {
        throw new Error("Invalid board settings");
      }

      // Create new column
      const newColumn = {
        id: columnTitle.toUpperCase().replace(/\s+/g, "_"),
        title: columnTitle,
        color: "#E5E7EB",
        bgColor: "#F9FAFB", 
        textColor: "#111827",
        borderStyle: "solid",
        icon: "circle",
        isVisible: true,
        order: board.settings.columns.length,
      };

      // Update board settings with new column
      const updatedSettings = {
        ...board.settings,
        columns: [...board.settings.columns, newColumn],
      };

      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      if (res.ok) {
        toast.success(`Column "${columnTitle}" added`);
        setColumnTitle("");
        setOpen(false);
        onColumnAdded();
      } else {
        throw new Error("Failed to add column");
      }
    } catch (error) {
      console.error("Failed to add column:", error);
      toast.error("Failed to add column");
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAdding) {
      handleAddColumn();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Plus className="h-4 w-4" />
          Add Column
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Columns className="h-4 w-4" />
              Add New Column
            </div>
            <p className="text-xs text-muted-foreground">
              Create a new column for {boardName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="column-title">Column Title</Label>
            <Input
              id="column-title"
              placeholder="e.g., In Review, Testing, Deployed"
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              disabled={isAdding}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setColumnTitle("");
                setOpen(false);
              }}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddColumn}
              disabled={isAdding || !columnTitle.trim()}
            >
              {isAdding ? "Adding..." : "Add Column"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}