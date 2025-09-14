"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MoreHorizontal,
  Mail,
  Shield,
  UserX,
  RefreshCw,
  UserPlus,
  Grid3x3,
  List,
  Users,
  UserCheck,
  Clock,
  Activity,
  Filter,
  ChevronRight,
  Star,
  TrendingUp,
  AlertCircle,
  Download,
  Upload,
  ClipboardClock,
} from "lucide-react";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { RoleColorSettings } from "@/components/users/role-color-settings";

// Type definitions
interface User {
  id: string;
  name: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "PROJECT_MANAGER" | "MEMBER" | "CLIENT";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  image: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED";
  expiresAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchUsers();
    fetchInvites();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(data);
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/invites/${inviteId}/resend`, {
        method: "POST",
      });
      if (res.ok) {
        fetchInvites();
      }
    } catch (error) {
      console.error("Failed to resend invite:", error);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      const res = await fetch(`/api/invites/${inviteId}/revoke`, {
        method: "POST",
      });
      if (res.ok) {
        fetchInvites();
      }
    } catch (error) {
      console.error("Failed to revoke invite:", error);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE" }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to deactivate user:", error);
    }
  };

  const getRoleBadgeColor = (role: string): string => {
    const colors: Record<string, string> = {
      OWNER: "bg-[#FF6B6B] text-white",
      ADMIN: "bg-[#96CEB4] text-white",
      PROJECT_MANAGER: "bg-[#4ECDC4] text-white",
      MEMBER: "bg-[#FFEAA7] text-black",
      CLIENT: "bg-[#45B7D1] text-white",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getStatusBadgeColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-700 border-green-200",
      INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
      SUSPENDED: "bg-red-100 text-red-700 border-red-200",
      INVITED: "bg-amber-100 text-amber-700 border-amber-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingInvites = invites.filter((i) => i.status === "PENDING");
  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const twoFactorEnabledCount = users.filter((u) => u.twoFactorEnabled).length;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Pending Invitations
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 rounded-lg p-2">
                        <Mail className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {invite.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Role:{" "}
                          <span className="font-medium text-gray-700">
                            {invite.role}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires{" "}
                          {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvite(invite.id)}
                        className="flex-1 border-amber-300 hover:bg-amber-50"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Display */}
          {viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white relative rounded-3xl p-4 transition-all group"
                >
                  <div className="rounded-2xl h-18 overflow-hidden">
                    <img alt="user background" src="/company-banner.png" />
                  </div>
                  <div className="flex items-start -mt-7 pl-4 justify-between mb-2.5">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-white">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback className="bg-[#222222] text-white font-semibold">
                          {user.name?.charAt(0) || user.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 absolute top-5 right-6 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="cursor-pointer">
                          <UserCheck className="h-3 w-3 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Star className="h-3 w-3 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Shield className="h-3 w-3 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeactivateUser(user.id)}
                          className="text-red-600 cursor-pointer"
                        >
                          <UserX className="h-3 w-3 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-1 mb-4 pl-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {user.name || "No name"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge
                      className={`${getRoleBadgeColor(user.role)} text-xs font-medium border`}
                    >
                      {user.role.replace("_", " ")}
                    </Badge>
                    <Badge
                      className={`${getStatusBadgeColor(user.status)} text-xs font-medium border`}
                    >
                      {user.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Shield
                        className={`h-3.5 w-3.5 ${
                          user.twoFactorEnabled
                            ? "text-green-600"
                            : "text-gray-300"
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        2FA {user.twoFactorEnabled ? "On" : "Off"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Users List View */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Security</TableHead>
                    <TableHead className="font-semibold">Joined</TableHead>
                    <TableHead className="text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 ring-2 ring-white shadow">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-semibold">
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {user.status === "ACTIVE" && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {user.name || "No name"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getRoleBadgeColor(user.role)} text-xs font-medium border`}
                        >
                          {user.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusBadgeColor(user.status)} text-xs font-medium border`}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield
                            className={`h-4 w-4 ${
                              user.twoFactorEnabled
                                ? "text-green-600"
                                : "text-gray-300"
                            }`}
                          />
                          <span className="text-xs text-gray-500">
                            {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer">
                              <UserCheck className="h-3 w-3 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Star className="h-3 w-3 mr-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Shield className="h-3 w-3 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeactivateUser(user.id)}
                              className="text-red-600 cursor-pointer"
                            >
                              <UserX className="h-3 w-3 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l flex flex-col">
        <div className="p-4 flex flex-col w-full border-b gap-4">
          {/* Invite Dialog */}
          <InviteUserDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            onSuccess={() => {
              fetchInvites();
              setShowInviteDialog(false);
            }}
          />
        </div>

        {/* Filters Section */}
        <div className="space-y-4 p-4 border-b">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-50 rounded-xl h-11 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 w-full">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-gray-50 min-h-11 rounded-xl w-full border-gray-200 focus:bg-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PROJECT_MANAGER">
                    Project Manager
                  </SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-50 min-h-11 rounded-xl w-full border-gray-200 focus:bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 border-b">
          {/* View Toggle */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              View Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={
                  viewMode === "list"
                    ? "bg-[#FF6B4A] rounded-lg h-9 hover:bg-[#FF6B4A]/80"
                    : "h-9 rounded-lg"
                }
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 p-4 border-b">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <Download className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Export Users
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <Upload className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Bulk Import
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button className="w-full text-left py-2 hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <ClipboardClock className="size-4" />
              <span className="text-sm ml-2 mr-auto text-gray-700">
                Audit Log
              </span>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
