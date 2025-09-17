"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit2, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ProposedTaskCardView = {
  name: string;
  description: string;
  dueDate: string;
  assigneeEmail?: string;
  priority: string;
  companyName?: string;
  labels: string[];
  _selected?: boolean;
};

export function DraftTaskCard({
  task,
  index,
  onEdit,
  onToggle,
  onDelete,
}: {
  task: ProposedTaskCardView;
  index: number;
  onEdit: () => void;
  onToggle: (checked: boolean) => void;
  onDelete?: () => void;
}) {
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

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-4 bg-white",
        task._selected
          ? "ring-2 ring-[#FF6B4A] border-[#FF6B4A]/30"
          : "border-gray-200"
      )}
    >
      <button
        onClick={() => onToggle(!task._selected)}
        className={cn(
          "absolute -top-2 -left-2 h-6 w-6 rounded-full border bg-white flex items-center justify-center shadow-sm",
          task._selected
            ? "border-[#FF6B4A] text-[#FF6B4A]"
            : "border-gray-300 text-gray-300"
        )}
        aria-label="Select task"
      >
        <Check className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-gray-400">
              DRAFT-{String(index + 1).padStart(2, "0")}
            </span>
            <Badge
              className={cn(
                "text-[10px] px-2 py-0.5",
                getPriorityColor(task.priority || "MEDIUM")
              )}
            >
              {task.priority || "MEDIUM"}
            </Badge>
            {task.companyName && (
              <span className="text-[11px] text-gray-500">
                • {task.companyName}
              </span>
            )}
            {task.assigneeEmail && (
              <span className="text-[11px] text-gray-500">
                • {task.assigneeEmail}
              </span>
            )}
            {task.dueDate && (
              <span className="text-[11px] text-gray-500 inline-flex items-center gap-1 ml-1">
                <Calendar className="h-3 w-3" />
                {task.dueDate}
              </span>
            )}
          </div>
          <div className="font-medium leading-snug">
            {task.name || "(untitled task)"}
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          {task.labels?.length ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.labels.map((l, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200"
                >
                  {l}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            className="h-7 w-7"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              className="h-7 w-7 text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
