// hooks/use-board-management.ts

import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface Board {
  id: string;
  name: string;
  description?: string;
  settings: any;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  permissions?: BoardPermissions;
}

export interface BoardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
}

export interface BoardMember {
  userId: string;
  boardId: string;
  role: "owner" | "admin" | "member" | "viewer";
  addedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface UseBoardManagementProps {
  companyId: string;
  userId?: string;
  userRole?: string; // Organization role: OWNER, ADMIN, MEMBER, etc.
}

export function useBoardManagement({ 
  companyId, 
  userId,
  userRole = "MEMBER" 
}: UseBoardManagementProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission checks based on organization role
  const canCreateBoards = ["OWNER", "ADMIN", "PROJECT_MANAGER"].includes(userRole);
  const canDeleteBoards = ["OWNER", "ADMIN"].includes(userRole);
  const canManageAllBoards = ["OWNER", "ADMIN"].includes(userRole);

  useEffect(() => {
    if (companyId) {
      fetchBoards();
    }
  }, [companyId]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/companies/${companyId}/boards`);
      if (!res.ok) throw new Error("Failed to fetch boards");
      
      const data = await res.json();
      
      // Filter boards based on permissions
      const visibleBoards = data.boards.filter((board: Board) => {
        // Owners and admins can see all boards
        if (canManageAllBoards) return true;
        
        // Others can only see boards they have access to
        return board.permissions?.canView || board.createdBy === userId;
      });
      
      setBoards(visibleBoards);
      
      // Set current board to default or first available
      if (visibleBoards.length > 0) {
        const defaultBoard = visibleBoards.find((b: Board) => b.isDefault) || visibleBoards[0];
        setCurrentBoard(defaultBoard);
      }
    } catch (err) {
      console.error("Failed to fetch boards:", err);
      setError("Failed to load boards");
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (boardData: {
    name: string;
    description?: string;
    template: string;
    settings: any;
  }) => {
    if (!canCreateBoards) {
      toast.error("You don't have permission to create boards");
      return null;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(boardData),
      });

      if (!res.ok) throw new Error("Failed to create board");

      const newBoard = await res.json();
      setBoards([...boards, newBoard]);
      setCurrentBoard(newBoard);
      
      toast.success(`Board "${boardData.name}" created successfully`);
      return newBoard;
    } catch (err) {
      console.error("Failed to create board:", err);
      toast.error("Failed to create board");
      return null;
    }
  };

  const updateBoard = async (boardId: string, updates: Partial<Board>) => {
    const board = boards.find(b => b.id === boardId);
    
    if (!board?.permissions?.canEdit && board?.createdBy !== userId && !canManageAllBoards) {
      toast.error("You don't have permission to edit this board");
      return false;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update board");

      const updatedBoard = await res.json();
      setBoards(boards.map(b => b.id === boardId ? updatedBoard : b));
      
      if (currentBoard?.id === boardId) {
        setCurrentBoard(updatedBoard);
      }
      
      toast.success("Board updated successfully");
      return true;
    } catch (err) {
      console.error("Failed to update board:", err);
      toast.error("Failed to update board");
      return false;
    }
  };

  const deleteBoard = async (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    
    if (!board?.permissions?.canDelete && board?.createdBy !== userId && !canDeleteBoards) {
      toast.error("You don't have permission to delete this board");
      return false;
    }

    if (boards.length <= 1) {
      toast.error("You must have at least one board");
      return false;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete board");

      const remainingBoards = boards.filter(b => b.id !== boardId);
      setBoards(remainingBoards);
      
      if (currentBoard?.id === boardId && remainingBoards.length > 0) {
        setCurrentBoard(remainingBoards[0]);
      }
      
      toast.success("Board deleted successfully");
      return true;
    } catch (err) {
      console.error("Failed to delete board:", err);
      toast.error("Failed to delete board");
      return false;
    }
  };

  const duplicateBoard = async (boardId: string) => {
    if (!canCreateBoards) {
      toast.error("You don't have permission to create boards");
      return null;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to duplicate board");

      const newBoard = await res.json();
      setBoards([...boards, newBoard]);
      
      toast.success("Board duplicated successfully");
      return newBoard;
    } catch (err) {
      console.error("Failed to duplicate board:", err);
      toast.error("Failed to duplicate board");
      return null;
    }
  };

  const setDefaultBoard = async (boardId: string) => {
    if (!canManageAllBoards) {
      toast.error("You don't have permission to set default board");
      return false;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}/default`, {
        method: "PUT",
      });

      if (!res.ok) throw new Error("Failed to set default board");

      // Update local state
      setBoards(boards.map(b => ({
        ...b,
        isDefault: b.id === boardId,
      })));
      
      toast.success("Default board updated");
      return true;
    } catch (err) {
      console.error("Failed to set default board:", err);
      toast.error("Failed to set default board");
      return false;
    }
  };

  const fetchBoardMembers = async (boardId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      
      const data = await res.json();
      setBoardMembers(data.members);
    } catch (err) {
      console.error("Failed to fetch board members:", err);
    }
  };

  const addBoardMember = async (boardId: string, userId: string, role: string) => {
    const board = boards.find(b => b.id === boardId);
    
    if (!board?.permissions?.canManageMembers && board?.createdBy !== userId && !canManageAllBoards) {
      toast.error("You don't have permission to manage board members");
      return false;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (!res.ok) throw new Error("Failed to add member");

      await fetchBoardMembers(boardId);
      toast.success("Member added successfully");
      return true;
    } catch (err) {
      console.error("Failed to add member:", err);
      toast.error("Failed to add member");
      return false;
    }
  };

  const removeBoardMember = async (boardId: string, memberId: string) => {
    const board = boards.find(b => b.id === boardId);
    
    if (!board?.permissions?.canManageMembers && board?.createdBy !== userId && !canManageAllBoards) {
      toast.error("You don't have permission to manage board members");
      return false;
    }

    try {
      const res = await fetch(`/api/companies/${companyId}/boards/${boardId}/members/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove member");

      await fetchBoardMembers(boardId);
      toast.success("Member removed successfully");
      return true;
    } catch (err) {
      console.error("Failed to remove member:", err);
      toast.error("Failed to remove member");
      return false;
    }
  };

  const switchBoard = (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    if (board) {
      setCurrentBoard(board);
    }
  };

  return {
    // State
    boards,
    currentBoard,
    boardMembers,
    loading,
    error,
    
    // Permissions
    canCreateBoards,
    canDeleteBoards,
    canManageAllBoards,
    
    // Actions
    createBoard,
    updateBoard,
    deleteBoard,
    duplicateBoard,
    setDefaultBoard,
    switchBoard,
    fetchBoardMembers,
    addBoardMember,
    removeBoardMember,
    refreshBoards: fetchBoards,
  };
}