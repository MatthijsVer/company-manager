import { useState, useEffect } from "react";
import { Plus, Crown, Shield, User, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserAssignment {
  id: string;
  userId: string;
  companyId: string;
  role?: string | null;
  isPrimary: boolean;
  permissions?: any;
  notes?: string | null;
  assignedAt: string;
  assignedBy?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    status: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  status: string;
}

interface CompanyTeamManagerProps {
  companyId: string;
  onUpdate?: () => void;
}

const roleOptions = [
  {
    value: "account_manager",
    label: "Account Manager",
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
  },
  {
    value: "sales_rep",
    label: "Sales Rep",
    icon: User,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    value: "support",
    label: "Support",
    icon: Shield,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  {
    value: "observer",
    label: "Observer",
    icon: User,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
  },
];

export function CompanyTeamManager({
  companyId,
  onUpdate,
}: CompanyTeamManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchUsers();
    fetchAssignments();
  }, [companyId]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isUserAssigned = (userId: string) => {
    return assignments.some((a) => a.userId === userId);
  };

  const getUserAssignment = (userId: string) => {
    return assignments.find((a) => a.userId === userId);
  };

  const handleUserToggle = async (userId: string, checked: boolean) => {
    // Add user to processing set
    setProcessingUsers((prev) => new Set(prev).add(userId));

    try {
      if (checked) {
        // Add user with default role
        const res = await fetch(`/api/companies/${companyId}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            role: "observer",
            isPrimary: false,
            permissions: {
              canEdit: false,
              canDelete: false,
              canManageTeam: false,
            },
          }),
        });

        if (res.ok) {
          const newAssignment = await res.json();
          setAssignments((prev) => [...prev, newAssignment]);
        } else {
          throw new Error("Failed to add user");
        }
      } else {
        // Remove user
        const res = await fetch(
          `/api/companies/${companyId}/assignments/${userId}`,
          {
            method: "DELETE",
          }
        );

        if (res.ok) {
          const assignment = getUserAssignment(userId);
          setAssignments((prev) => prev.filter((a) => a.userId !== userId));
        } else {
          throw new Error("Failed to remove user");
        }
      }
    } catch (error) {
      console.error("Failed to update assignment:", error);
    } finally {
      // Remove user from processing set
      setProcessingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setProcessingUsers((prev) => new Set(prev).add(userId));

    try {
      const res = await fetch(
        `/api/companies/${companyId}/assignments/${userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            permissions: {
              canEdit: role === "account_manager",
              canDelete: false,
              canManageTeam: role === "account_manager",
            },
          }),
        }
      );

      if (res.ok) {
        const updatedAssignment = await res.json();
        setAssignments((prev) =>
          prev.map((a) => (a.userId === userId ? updatedAssignment : a))
        );
      } else {
        throw new Error("Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setProcessingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getRoleDetails = (role: string | null | undefined) => {
    return roleOptions.find((r) => r.value === role) || roleOptions[3]; // Default to observer
  };

  return (
    <div className="bg-white ml-auto flex items-center rounded-full p-0">
      <TooltipProvider>
        <div className="flex -space-x-2">
          {assignments.slice(0, 3).map((assignment) => {
            const roleDetails = getRoleDetails(assignment.role);
            const RoleIcon = roleDetails.icon;

            return (
              <Tooltip key={assignment.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="size-8 border-2 border-white text-[11px] font-semibold cursor-pointer hover:z-10">
                      {assignment.user.image ? (
                        <AvatarImage src={assignment.user.image} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
                          {getInitials(assignment.user.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {assignment.isPrimary && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 rounded-full border border-white" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{assignment.user.name}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-0.5",
                        roleDetails.color
                      )}
                    >
                      <RoleIcon className="h-3 w-3" />
                      <span>{roleDetails.label}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {assignments.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[11px] font-semibold border-2 border-white text-gray-700">
                  +{assignments.length - 3}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium mb-1">
                    {assignments.length - 3} more team members
                  </p>
                  {assignments.slice(3).map((a) => (
                    <p key={a.id} className="text-muted-foreground">
                      {a.user.name}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="size-6 rounded-full mr-2 flex items-center justify-center hover:bg-gray-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-96 shadow-none p-0">
          <div className="p-2 max-h-[400px] overflow-y-auto">
            {users?.map((user) => {
              const isAssigned = isUserAssigned(user.id);
              const assignment = getUserAssignment(user.id);
              const isProcessing = processingUsers.has(user.id);
              const roleDetails = getRoleDetails(assignment?.role);

              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                    isAssigned
                      ? "bg-gray-50/50 dark:bg-gray-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  )}
                >
                  <div className="relative">
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/80 rounded flex items-center justify-center z-10">
                        <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <Checkbox
                      checked={isAssigned}
                      onCheckedChange={(checked) =>
                        handleUserToggle(user.id, checked as boolean)
                      }
                      disabled={isProcessing}
                      className="data-[state=checked]:bg-[#1F1F1F] data-[state=checked]:border-[#1F1F1F]"
                    />
                  </div>

                  <Avatar className="size-8">
                    {user.image ? (
                      <AvatarImage src={user.image} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-900 text-xs font-semibold text-white">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  {isAssigned && (
                    <Select
                      value={assignment?.role || "observer"}
                      onValueChange={(value) =>
                        handleRoleChange(user.id, value)
                      }
                      disabled={isProcessing}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 p-0 text-xs border-0",
                          roleDetails.bgColor,
                          roleDetails.color
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-1.5">
                              <role.icon className="h-3.5 w-3.5" />
                              <span>{role.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
