"use client";

import { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Globe, Lock, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BoardPermissionsPopoverProps {
  boardId: string;
  boardName: string;
  companyId: string;
  userRole: string;
}

interface TeamMember {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  role?: string;
}

interface BoardPermission {
  userId: string;
  canView: boolean;
  canEdit: boolean;
  canManageMembers: boolean;
}

export function BoardPermissionsPopover({
  boardId,
  boardName,
  companyId,
  userRole,
}: BoardPermissionsPopoverProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [permissions, setPermissions] = useState<Map<string, BoardPermission>>(
    new Map()
  );
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, boardId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch team members from company assignments
      const teamRes = await fetch(`/api/companies/${companyId}/assignments`);
      if (teamRes.ok) {
        const assignments = await teamRes.json();
        setTeamMembers(assignments);
      }

      // Fetch board permissions
      const permRes = await fetch(`/api/boards/${boardId}/permissions`);
      if (permRes.ok) {
        const permData = await permRes.json();
        setIsPublic(permData.isPublic);

        // Convert permissions array to Map
        const permMap = new Map<string, BoardPermission>();
        permData.permissions?.forEach((perm: any) => {
          permMap.set(perm.userId, {
            userId: perm.userId,
            canView: perm.canView,
            canEdit: perm.canEdit,
            canManageMembers: perm.canManageMembers,
          });
        });
        setPermissions(permMap);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    userId: string,
    field: keyof BoardPermission,
    value: boolean
  ) => {
    setPermissions((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(userId) || {
        userId,
        canView: false,
        canEdit: false,
        canManageMembers: false,
      };

      // If removing view permission, remove all permissions
      if (field === "canView" && !value) {
        newMap.delete(userId);
      } else {
        // If adding edit or manage, ensure view is also enabled
        if ((field === "canEdit" || field === "canManageMembers") && value) {
          current.canView = true;
        }
        current[field] = value;
        newMap.set(userId, current);
      }

      return newMap;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await fetch(`/api/boards/${boardId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic,
          permissions: Array.from(permissions.values()),
        }),
      });

      if (res.ok) {
        toast.success("Permissions updated");
        setOpen(false);
      } else {
        throw new Error("Failed to update permissions");
      }
    } catch (error) {
      console.error("Failed to save permissions:", error);
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Admins can see all boards
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Shield className="h-4 w-4" />
          Permissions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Board Permissions</h3>
            {saving && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-orange-600" />
              )}
              <div>
                <Label className="text-sm font-medium">
                  {isPublic ? "Public Board" : "Private Board"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? "All team members can view" : "Restricted access"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={saving}
            />
          </div>

          {/* Admin Notice */}
          {isAdmin && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              <Users className="h-3 w-3 inline mr-1" />
              Admins have access to all boards
            </div>
          )}

          {/* Member Permissions */}
          {!isPublic && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                MEMBER PERMISSIONS
              </Label>
              <ScrollArea className="h-[250px]">
                <div className="space-y-1">
                  {loading ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      Loading team...
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No team members
                    </div>
                  ) : (
                    teamMembers.map((member) => {
                      const perm = permissions.get(member.user.id);
                      const isUserAdmin =
                        member.role === "ADMIN" || member.role === "OWNER";

                      return (
                        <div
                          key={member.user.id}
                          className={cn(
                            "flex items-center justify-between py-2 px-2 rounded hover:bg-muted/50",
                            isUserAdmin && "opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="size-6">
                              <AvatarImage src={member.user.image} />
                              <AvatarFallback className="text-xs bg-[#222222] text-white">
                                {getInitials(
                                  member.user.name,
                                  member.user.email
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {member.user.name || member.user.email}
                              </p>
                              {member.role && (
                                <p className="text-xs text-muted-foreground">
                                  {member.role}
                                </p>
                              )}
                            </div>
                          </div>

                          {isUserAdmin ? (
                            <div className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-muted-foreground">
                                Full access
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`view-${member.user.id}`}
                                  checked={perm?.canView || false}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(
                                      member.user.id,
                                      "canView",
                                      !!checked
                                    )
                                  }
                                  disabled={saving}
                                  className="h-4 w-4"
                                />
                                <Label
                                  htmlFor={`view-${member.user.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  View
                                </Label>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`edit-${member.user.id}`}
                                  checked={perm?.canEdit || false}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(
                                      member.user.id,
                                      "canEdit",
                                      !!checked
                                    )
                                  }
                                  disabled={!perm?.canView || saving}
                                  className="h-4 w-4"
                                />
                                <Label
                                  htmlFor={`edit-${member.user.id}`}
                                  className="text-xs cursor-pointer"
                                >
                                  Edit
                                </Label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          <Button
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
