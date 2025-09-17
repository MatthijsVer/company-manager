"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Tag, Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/types/kanban";
import { TaskLabels, TaskLabel } from "./task-label";

interface LabelManagerProps {
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
  availableLabels?: Label[];
}

const DEFAULT_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#EAB308", // Yellow
  "#22C55E", // Green
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#6B7280", // Gray
  "#1F2937", // Dark Gray
];

export function LabelManager({
  selectedLabels,
  onLabelsChange,
  availableLabels = [],
}: LabelManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(DEFAULT_COLORS[0]);

  const toggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some((l) => l.id === label.id);

    if (isSelected) {
      onLabelsChange(selectedLabels.filter((l) => l.id !== label.id));
    } else {
      onLabelsChange([...selectedLabels, label]);
    }
  };

  const createNewLabel = () => {
    if (!newLabelName.trim()) return;

    // Generate a proper unique ID for the label
    const newLabel: Label = {
      id: `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newLabelName.trim(),
      color: newLabelColor,
    };

    onLabelsChange([...selectedLabels, newLabel]);
    setNewLabelName("");
    setNewLabelColor(DEFAULT_COLORS[0]);
    setIsCreating(false);
  };

  const removeLabel = (labelId: string) => {
    onLabelsChange(selectedLabels.filter((l) => l.id !== labelId));
  };

  return (
    <div className="space-y-3">
      {/* Current Labels */}
      {selectedLabels.length > 0 && (
        <div className="space-y-2">
          <UILabel className="text-sm font-medium">Current Labels</UILabel>
          <div className="flex flex-wrap gap-1">
            {selectedLabels.map((label) => (
              <div key={label.id} className="relative group">
                <TaskLabel label={label} size="md" />
                <button
                  onClick={() => removeLabel(label.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Labels */}
      <div className="space-y-2">
        <UILabel className="text-sm font-medium">Add Labels</UILabel>

        {/* Available Labels */}
        {availableLabels.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Available labels:</p>
            <div className="flex flex-wrap gap-1">
              {availableLabels
                .filter(
                  (label) => !selectedLabels.some((l) => l.id === label.id)
                )
                .map((label) => (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label)}
                    className="transition-opacity hover:opacity-75"
                  >
                    <TaskLabel label={label} size="md" variant="outline" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Create New Label */}
        {!isCreating ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Label
          </Button>
        ) : (
          <div className="space-y-3 p-3 border rounded-lg">
            <div className="space-y-2">
              <UILabel htmlFor="label-name">Label Name</UILabel>
              <Input
                id="label-name"
                placeholder="Enter label name..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createNewLabel();
                  } else if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewLabelName("");
                  }
                }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <UILabel>Color</UILabel>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewLabelColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      newLabelColor === color
                        ? "border-gray-900 scale-110"
                        : "border-gray-300 hover:border-gray-500"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Preview */}
              {newLabelName && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                  <TaskLabel
                    label={{
                      id: "preview",
                      name: newLabelName,
                      color: newLabelColor,
                    }}
                    size="md"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={createNewLabel}
                disabled={!newLabelName.trim()}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-1" />
                Create
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewLabelName("");
                  setNewLabelColor(DEFAULT_COLORS[0]);
                }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
