"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Edit2, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

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

export const getPriorityColor = (priority: string) => {
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
  return (
    <div className={cn("group relative rounded-2xl bg-white")}>
      {task._selected && (
        <button
          onClick={() => onToggle(!task._selected)}
          className={cn(
            "absolute top-3 right-3 size-4 rounded-full border bg-white flex items-center justify-center shadow-sm",
            task._selected
              ? "border-[#FF6B4A] text-[#FF6B4A]"
              : "border-gray-300 text-gray-300"
          )}
          aria-label="Select task"
        >
          <div className="bg-[#FF6b4A] size-2 rounded-full" />
        </button>
      )}

      <div
        className="flex items-start cursor-pointer p-4 justify-between gap-3"
        onClick={() => onToggle(!task._selected)}
      >
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
      </div>
      <div className="w-full rounded-b-2xl bg-[#FAFAFA] px-4 py-0.5 flex items-center justify-end">
        <div className="flex items-center mr-auto">
          <Avatar className="size-5.5">
            <AvatarImage />
            <AvatarFallback className="bg-[#222222] text-white text-[9px] font-semibold">
              MA
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-gray-900 font-medium ml-2">Unassigned</p>
        </div>
        <Button
          variant="ghost"
          onClick={onEdit}
          className="text-gray-900 text-xs"
        >
          <Edit2 className="size-3" />
          Edit
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-gray-900 text-xs"
          >
            <Trash2 className="size-3" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
