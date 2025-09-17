"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  Check,
  ChevronsUp,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label as KanbanLabel } from "@/types/kanban";
import { LabelManager } from "@/components/kanban/label-manager";

type UserLite = {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
};
type CompanyLite = { id: string; name: string; slug?: string | null };

type ProposedTask = {
  name: string;
  description: string;
  dueDate: string; // ISO date (YYYY-MM-DD) or ""
  assignedToId?: string | null; // <-- NEW: select user
  assigneeEmail?: string; // kept for compatibility, not used if assignedToId set
  priority: string; // LOW|MEDIUM|HIGH|URGENT
  companyId?: string | null; // <-- NEW: select company
  companyName: string; // optional fallback (for auto-create)
  companySlug: string;
  labels: KanbanLabel[]; // <-- NEW: rich labels (name/color/etc)
};

export function DraftTaskDialog({
  open,
  onOpenChange,
  task,
  onChange,
  users,
  companies,
  availableLabels = [],
  onDelete,
  index,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: ProposedTask;
  onChange: (t: ProposedTask) => void;
  users: UserLite[];
  companies: CompanyLite[];
  availableLabels?: KanbanLabel[];
  onDelete?: () => void;
  index: number;
}) {
  const [local, setLocal] = useState<ProposedTask>(task);

  useEffect(() => setLocal(task), [task]);

  const due = useMemo(
    () => (local.dueDate ? new Date(local.dueDate) : null),
    [local.dueDate]
  );

  const getPriorityIcon = (p: string) => {
    switch (p) {
      case "URGENT":
        return <ChevronsUp className="h-3.5 w-3.5 text-red-500" />;
      case "HIGH":
        return <ArrowUp className="h-3.5 w-3.5 text-orange-500" />;
      case "MEDIUM":
        return <Minus className="h-3.5 w-3.5 text-yellow-500" />;
      case "LOW":
        return <ArrowDown className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return <Minus className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  function saveAndClose() {
    // If a companyId is chosen, clear the free-text companyName (avoid accidental auto-create)
    const next = {
      ...local,
      companyName: local.companyId ? "" : local.companyName || "",
    };
    onChange(next);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:w-[560px] right-4 h-[97vh] rounded-xl mt-4 sm:max-w-xl p-0 [&>button]:hidden">
        <SheetHeader className="px-6 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                DRAFT-{String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {getPriorityIcon(local.priority)}
                <span>{local.priority || "MEDIUM"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onDelete();
                    onOpenChange(false);
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveAndClose}
                className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
          <SheetTitle className="sr-only">Draft Task</SheetTitle>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          <Input
            value={local.name}
            onChange={(e) => setLocal((x) => ({ ...x, name: e.target.value }))}
            placeholder="Task title…"
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 shadow-none"
            autoFocus
          />

          <div>
            <UILabel className="text-sm font-medium mb-2 block">
              Description
            </UILabel>
            <Textarea
              value={local.description}
              onChange={(e) =>
                setLocal((x) => ({ ...x, description: e.target.value }))
              }
              placeholder="Add description…"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Priority */}
            <div>
              <UILabel className="text-sm font-medium mb-2 block">
                Priority
              </UILabel>
              <Select
                value={local.priority || "MEDIUM"}
                onValueChange={(v) => setLocal((x) => ({ ...x, priority: v }))}
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
            </div>

            {/* Assignee (user select) */}
            <div>
              <UILabel className="text-sm font-medium mb-2 block">
                Assignee
              </UILabel>
              <Select
                value={local.assignedToId ?? "unassigned"}
                onValueChange={(v) =>
                  setLocal((x) => ({
                    ...x,
                    assignedToId: v === "unassigned" ? null : v,
                    assigneeEmail: "", // not used when assignedToId is set
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={u.image || undefined} />
                          <AvatarFallback className="text-[10px] bg-[#222222] text-white">
                            {(
                              u.name?.charAt(0) || u.email.charAt(0)
                            ).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.name || u.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div>
              <UILabel className="text-sm font-medium mb-2 block">
                Due date
              </UILabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !due && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {due ? format(due, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={due || undefined}
                    onSelect={(d) =>
                      setLocal((x) => ({
                        ...x,
                        dueDate: d ? d.toISOString().slice(0, 10) : "",
                      }))
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Company select + optional new company name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <UILabel className="text-sm font-medium mb-2 block">
                Company
              </UILabel>
              <Select
                value={local.companyId ?? "none"}
                onValueChange={(v) =>
                  setLocal((x) => ({
                    ...x,
                    companyId: v === "none" ? null : v,
                    companyName: v === "none" ? x.companyName : "", // clear free-text if selecting
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-gray-500 mt-1">
                Or leave unselected and enter a new name → auto-create on
                commit.
              </p>
            </div>

            <div>
              <UILabel className="text-sm font-medium mb-2 block">
                New company name (optional)
              </UILabel>
              <Input
                value={local.companyName}
                onChange={(e) =>
                  setLocal((x) => ({ ...x, companyName: e.target.value }))
                }
                placeholder="Type to create on commit…"
                disabled={!!local.companyId}
              />
            </div>
          </div>

          {/* Labels manager */}
          <div>
            <UILabel className="text-sm font-medium mb-2 block">Labels</UILabel>
            <LabelManager
              selectedLabels={local.labels || []}
              onLabelsChange={(labels) => setLocal((x) => ({ ...x, labels }))}
              availableLabels={availableLabels}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
