"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Plus,
  Layout,
  Briefcase,
  Code,
  Megaphone,
  Users,
  HeadphonesIcon,
  TrendingUp,
  Calendar,
  Star,
  Copy,
  Trash2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Board {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BoardSelectorProps {
  companyId: string;
  currentBoardId?: string;
  onBoardChange: (boardId: string) => void;
}

const BOARD_TEMPLATES = [
  {
    id: "general",
    name: "General",
    icon: Layout,
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

export function BoardSelector({
  companyId,
  currentBoardId,
  onBoardChange,
}: BoardSelectorProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create board form state
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("general");

  useEffect(() => {
    fetchBoards();
  }, [companyId]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/boards`);
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);

        // Set current board
        if (data.boards && data.boards.length > 0) {
          const defaultBoard =
            data.boards.find((b: Board) => b.isDefault) || data.boards[0];
          setCurrentBoard(defaultBoard);
          if (!currentBoardId) {
            onBoardChange(defaultBoard.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch boards:", error);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    try {
      setIsCreating(true);
      const template = BOARD_TEMPLATES.find((t) => t.id === selectedTemplate);

      const res = await fetch(`/api/companies/${companyId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
          template: selectedTemplate,
          columns: template?.columns,
        }),
      });

      if (res.ok) {
        const newBoard = await res.json();
        toast.success("Board created successfully");
        setShowCreateDialog(false);
        setNewBoardName("");
        setNewBoardDescription("");
        await fetchBoards();
        onBoardChange(newBoard.id);
      } else {
        throw new Error("Failed to create board");
      }
    } catch (error) {
      console.error("Failed to create board:", error);
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (boards.length <= 1) {
      toast.error("You must have at least one board");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this board? All tasks will be lost."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Board deleted successfully");
        await fetchBoards();
      } else {
        throw new Error("Failed to delete board");
      }
    } catch (error) {
      console.error("Failed to delete board:", error);
      toast.error("Failed to delete board");
    }
  };

  const handleDuplicateBoard = async (boardId: string) => {
    try {
      const res = await fetch(
        `/api/companies/${companyId}/boards/${boardId}/duplicate`,
        {
          method: "POST",
        }
      );

      if (res.ok) {
        const newBoard = await res.json();
        toast.success("Board duplicated successfully");
        await fetchBoards();
        onBoardChange(newBoard.id);
      } else {
        throw new Error("Failed to duplicate board");
      }
    } catch (error) {
      console.error("Failed to duplicate board:", error);
      toast.error("Failed to duplicate board");
    }
  };

  const handleSetDefault = async (boardId: string) => {
    try {
      const res = await fetch(
        `/api/companies/${companyId}/boards/${boardId}/default`,
        {
          method: "PUT",
        }
      );

      if (res.ok) {
        toast.success("Default board updated");
        await fetchBoards();
      } else {
        throw new Error("Failed to set default board");
      }
    } catch (error) {
      console.error("Failed to set default board:", error);
      toast.error("Failed to set default board");
    }
  };

  const handleBoardSelect = (board: Board) => {
    setCurrentBoard(board);
    onBoardChange(board.id);
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="min-w-[200px]">
        <Layout className="h-4 w-4 mr-2" />
        Loading boards...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              <span className="font-medium">
                {currentBoard?.name || "Select Board"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
          <DropdownMenuLabel>Boards</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {boards.map((board) => (
            <DropdownMenuItem
              key={board.id}
              className={cn(
                "flex items-center justify-between group cursor-pointer",
                currentBoard?.id === board.id && "bg-accent"
              )}
              onClick={() => handleBoardSelect(board)}
            >
              <div className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                <div>
                  <div className="font-medium">{board.name}</div>
                  {board.description && (
                    <div className="text-xs text-muted-foreground">
                      {board.description}
                    </div>
                  )}
                </div>
                {board.isDefault && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDuplicateBoard(board.id)}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {!board.isDefault && (
                    <DropdownMenuItem
                      onClick={() => handleSetDefault(board.id)}
                    >
                      <Star className="h-3 w-3 mr-2" />
                      Set as default
                    </DropdownMenuItem>
                  )}
                  {boards.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteBoard(board.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create new board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Board Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Choose a template and customize your new kanban board
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g., Development Sprint"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-description">Description (Optional)</Label>
              <Textarea
                id="board-description"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                placeholder="Describe the purpose of this board..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
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
                <div className="text-xs text-muted-foreground p-2 bg-accent rounded">
                  {
                    BOARD_TEMPLATES.find((t) => t.id === selectedTemplate)
                      ?.description
                  }
                  <div className="mt-1">
                    <strong>Columns:</strong>{" "}
                    {BOARD_TEMPLATES.find(
                      (t) => t.id === selectedTemplate
                    )?.columns.join(" → ")}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBoard}
              disabled={isCreating}
              className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
            >
              {isCreating ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
