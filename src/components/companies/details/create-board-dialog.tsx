"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layout,
  Code,
  Megaphone,
  TrendingUp,
  HeadphonesIcon,
  Users,
  Calendar,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onBoardCreated: (board: any) => void;
}

const BOARD_TEMPLATES = [
  {
    id: "general",
    name: "General",
    icon: Briefcase,
    description: "Basic task management board",
    columns: ["To Do", "In Progress", "Review", "Done"],
  },
  {
    id: "development",
    name: "Development",
    icon: Code,
    description: "Software development workflow",
    columns: [
      "Backlog",
      "To Do",
      "In Progress",
      "Code Review",
      "Testing",
      "Done",
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    description: "Marketing campaign management",
    columns: [
      "Ideas",
      "Planning",
      "Creating",
      "Review",
      "Scheduled",
      "Published",
    ],
  },
  {
    id: "sales",
    name: "Sales Pipeline",
    icon: TrendingUp,
    description: "Sales opportunity tracking",
    columns: [
      "Leads",
      "Contacted",
      "Qualified",
      "Proposal",
      "Negotiation",
      "Closed",
    ],
  },
  {
    id: "support",
    name: "Support",
    icon: HeadphonesIcon,
    description: "Customer support tickets",
    columns: [
      "New",
      "Triaging",
      "In Progress",
      "Waiting on Customer",
      "Resolved",
    ],
  },
  {
    id: "hr",
    name: "HR & Recruitment",
    icon: Users,
    description: "Hiring and HR processes",
    columns: [
      "Applications",
      "Screening",
      "Interview",
      "Reference Check",
      "Offer",
      "Hired",
    ],
  },
  {
    id: "sprint",
    name: "Sprint Board",
    icon: Calendar,
    description: "Agile sprint management",
    columns: ["Sprint Backlog", "In Progress", "In Review", "Done", "Blocked"],
  },
];

export function CreateBoardDialog({
  open,
  onOpenChange,
  companyId,
  onBoardCreated,
}: CreateBoardDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template: "general",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      setIsCreating(true);

      const template = BOARD_TEMPLATES.find((t) => t.id === formData.template);
      const settings = buildBoardSettings(template?.columns || []);

      const res = await fetch(`/api/companies/${companyId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          template: formData.template,
          settings,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create board");
      }

      const newBoard = await res.json();

      toast.success(`Board "${formData.name}" created successfully`);
      onBoardCreated(newBoard);
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        description: "",
        template: "general",
      });
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const buildBoardSettings = (columns: string[]) => {
    const colorSchemes = [
      { color: "#E5E7EB", bgColor: "#F9FAFB", textColor: "#111827" },
      { color: "#DBEAFE", bgColor: "#EFF6FF", textColor: "#1E40AF" },
      { color: "#FEF3C7", bgColor: "#FFFBEB", textColor: "#92400E" },
      { color: "#D1FAE5", bgColor: "#F0FDF4", textColor: "#065F46" },
      { color: "#FEE2E2", bgColor: "#FEF2F2", textColor: "#991B1B" },
      { color: "#F3E8FF", bgColor: "#FAF5FF", textColor: "#6B21A8" },
    ];

    return {
      columns: columns.map((name, index) => ({
        id: name.toUpperCase().replace(/\s+/g, "_"),
        title: name,
        ...colorSchemes[index % colorSchemes.length],
        borderStyle: "solid",
        icon: "circle",
        isVisible: true,
        order: index,
      })),
      cardStyle: {
        showPriority: true,
        showAssignee: true,
        showDueDate: true,
        showDescription: true,
        showComments: true,
        showAttachments: true,
        showEstimate: formData.template === "development",
        cardHeight: "normal",
        borderRadius: "1rem",
        shadow: "shadow-sm",
      },
      boardStyle: {
        backgroundColor: "#F9FAFB",
        columnSpacing: "0.5rem",
        showColumnLimits: true,
        showEmptyMessage: true,
        compactMode: false,
      },
    };
  };

  const selectedTemplate = BOARD_TEMPLATES.find(
    (t) => t.id === formData.template
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Set up a new kanban board for your project workflow
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Board Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Q1 Development Sprint"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What is this board for?"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template">Template</Label>
            <Select
              value={formData.template}
              onValueChange={(value) =>
                setFormData({ ...formData, template: value })
              }
            >
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOARD_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedTemplate && (
              <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                <div className="text-xs">
                  <span className="font-medium">Columns: </span>
                  <span className="text-muted-foreground">
                    {selectedTemplate.columns.join(" → ")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !formData.name.trim()}
            className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
          >
            {isCreating ? "Creating..." : "Create Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
