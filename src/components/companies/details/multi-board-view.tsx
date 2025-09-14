// components/kanban/multi-board-view.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Plus,
  Search,
  Layout,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  ChevronUp,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { BoardSettings, Task } from "@/types/kanban";
import { CreateBoardDialog } from "./create-board-dialog";
import { BoardPermissionsPopover } from "@/components/kanban/board-permissions-popover";
import { AddColumnPopover } from "@/components/kanban/add-column-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "./company-kanban";

interface Board {
  id: string;
  name: string;
  settings: BoardSettings;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MultiBoardViewProps {
  companyId: string;
  userId: string;
  userRole: string;
}

export function MultiBoardView({
  companyId,
  userId,
  userRole = "MEMBER",
}: MultiBoardViewProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [visibleBoardIds, setVisibleBoardIds] = useState<Set<string>>(
    new Set()
  );
  const [collapsedBoardIds, setCollapsedBoardIds] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateBoardDialog, setShowCreateBoardDialog] = useState(false);

  // localStorage key for this company's board preferences
  const STORAGE_KEY = `board-preferences-${companyId}`;

  const canCreateBoards = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(
    userRole
  );

  // Debug logging
  console.log("MultiBoardView Debug:", {
    userRole,
    canCreateBoards,
    allowedRoles: ["OWNER", "ADMIN", "PROJECT_MANAGER"],
  });

  useEffect(() => {
    fetchBoards();
  }, [companyId]);

  const setDefaultVisibleBoard = (boards: Board[]) => {
    if (boards && boards.length > 0) {
      const defaultBoard = boards.find((b: Board) => b.isDefault) || boards[0];
      setVisibleBoardIds(new Set([defaultBoard.id]));
      console.log("Initial visible board:", defaultBoard); // Debug log
    }
  };

  const savePreferences = (boardIds: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(boardIds)));
    } catch (e) {
      console.error("Failed to save preferences to localStorage:", e);
    }
  };

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/boards`);
      const data = await res.json();

      setBoards(data.boards || []);
      console.log("Fetched boards:", data.boards); // Debug log

      // Load saved preferences from localStorage
      const savedPreferences = localStorage.getItem(STORAGE_KEY);

      if (savedPreferences) {
        try {
          const savedBoardIds = JSON.parse(savedPreferences);
          // Only use saved IDs that still exist in current boards
          const validIds = savedBoardIds.filter((id: string) =>
            data.boards?.some((b: Board) => b.id === id)
          );
          if (validIds.length > 0) {
            setVisibleBoardIds(new Set(validIds));
            console.log("Restored visible boards from localStorage:", validIds);
          } else {
            // Fallback to default if no valid saved boards
            setDefaultVisibleBoard(data.boards);
          }
        } catch (e) {
          console.error("Failed to parse saved preferences:", e);
          setDefaultVisibleBoard(data.boards);
        }
      } else {
        // No saved preferences, use default
        setDefaultVisibleBoard(data.boards);
      }
    } catch (error) {
      console.error("Failed to fetch boards:", error);
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const toggleBoardVisibility = (boardId: string) => {
    setVisibleBoardIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      savePreferences(newSet);
      return newSet;
    });
  };

  const toggleBoardCollapse = (boardId: string) => {
    setCollapsedBoardIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
  };

  const showAllBoards = () => {
    const allBoardIds = new Set(boards.map((b) => b.id));
    setVisibleBoardIds(allBoardIds);
    savePreferences(allBoardIds);
  };

  const hideAllBoards = () => {
    setVisibleBoardIds(new Set());
    savePreferences(new Set());
  };

  const handleBoardCreated = async (newBoard: Board) => {
    await fetchBoards();
    // Automatically show the new board
    setVisibleBoardIds((prev) => {
      const newSet = new Set([...prev, newBoard.id]);
      savePreferences(newSet);
      return newSet;
    });
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this board? All tasks will be preserved."
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
        setVisibleBoardIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(boardId);
          savePreferences(newSet);
          return newSet;
        });
        await fetchBoards();
      } else {
        throw new Error("Failed to delete board");
      }
    } catch (error) {
      console.error("Failed to delete board:", error);
      toast.error("Failed to delete board");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B4A] mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading boards...</p>
        </div>
      </div>
    );
  }

  const visibleBoards = boards.filter((b) => visibleBoardIds.has(b.id));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Board Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <Layout className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">
                    {visibleBoards.length === 0
                      ? "Select boards"
                      : `${visibleBoards.length} board${visibleBoards.length !== 1 ? "s" : ""} active`}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[250px]">
                <DropdownMenuLabel>Available Boards</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {boards.map((board) => (
                  <DropdownMenuCheckboxItem
                    key={board.id}
                    checked={visibleBoardIds.has(board.id)}
                    onCheckedChange={() => toggleBoardVisibility(board.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{board.name}</span>
                      {board.isDefault && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5 space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={showAllBoards}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={hideAllBoards}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide All
                  </Button>
                </div>

                {canCreateBoards && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setShowCreateBoardDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Board
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <Input
              placeholder="Search all boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Boards Container */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxWidth: "calc(100vw - 16rem)" }}
      >
        {visibleBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Layout className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No boards selected
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Select boards from the dropdown above to view them
            </p>
            <Button
              variant="outline"
              onClick={() =>
                boards.length > 0
                  ? showAllBoards()
                  : setShowCreateBoardDialog(true)
              }
            >
              {boards.length > 0 ? "Show All Boards" : "Create First Board"}
            </Button>
          </div>
        ) : (
          <div className="">
            {visibleBoards.map((board, i) => (
              <div key={board.id}>
                {/* Board Header */}
                <div
                  className={`px-4 py-1 flex items-center justify-between ${i !== 0 && "border-t border-b"}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBoardCollapse(board.id)}
                      className="hover:bg-gray-100 rounded p-1"
                    >
                      {collapsedBoardIds.has(board.id) ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronUp className="h-5 w-5" />
                      )}
                    </button>
                    <h2 className="text-sm font-semibold">{board.name}</h2>
                    {board.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canCreateBoards && (
                      <>
                        <AddColumnPopover
                          boardId={board.id}
                          boardName={board.name}
                          onColumnAdded={fetchBoards}
                        />
                        <BoardPermissionsPopover
                          boardId={board.id}
                          boardName={board.name}
                          companyId={companyId}
                          userRole={userRole}
                        />
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBoardVisibility(board.id)}
                    >
                      <EyeOff className="h-4 w-4" />
                      Hide
                    </Button>
                    {canCreateBoards && !board.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBoard(board.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Board Content */}
                {!collapsedBoardIds.has(board.id) && (
                  <div className="">
                    <KanbanBoard
                      key={board.id}
                      boardId={board.id}
                      companyId={companyId}
                      userId={userId}
                      userRole={userRole}
                      searchQuery={searchQuery}
                      embedded={true}
                      initialSettings={board.settings}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      {canCreateBoards && (
        <CreateBoardDialog
          open={showCreateBoardDialog}
          onOpenChange={setShowCreateBoardDialog}
          companyId={companyId}
          onBoardCreated={handleBoardCreated}
        />
      )}
    </div>
  );
}
