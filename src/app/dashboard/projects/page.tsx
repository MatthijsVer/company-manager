"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  MoreHorizontal,
  Building2,
  Globe,
  Pencil,
  Trash,
  Download,
  Upload,
  Loader2,
  Settings,
  X,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  FileText,
  GripVertical,
  Filter,
  Archive,
  Star,
  StarOff,
  Mail,
  Phone,
  MapPin,
  Copy,
  Grid3x3,
  Rows3,
  Users,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  SlidersHorizontal,
  Zap,
  Building,
  User,
  ArrowUpDown,
  ChevronDown,
  FolderPlus,
  ExternalLink,
  Activity,
  Target,
  Briefcase,
  BarChart3,
  Check,
} from "lucide-react";
import { CompanyDialog } from "@/components/companies/company-dialog";
import { ImportDialog } from "@/components/companies/import-dialog";
import { DeleteDialog } from "@/components/companies/delete-dialog";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Company {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: any;
  customFields?: any;
  status: string;
  type: string;
  tags?: string;
  color?: string;
  isFavorite?: boolean;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields for better UX
  lastContactDate?: string;
  dealValue?: number;
  contactPerson?: string;
  industry?: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: "#10b981", icon: CheckCircle },
  { value: "INACTIVE", label: "Inactive", color: "#6b7280", icon: X },
  { value: "PENDING", label: "Pending", color: "#f59e0b", icon: Clock },
  { value: "ARCHIVED", label: "Archived", color: "#ef4444", icon: Archive },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#ef4444", icon: AlertCircle },
  { value: "high", label: "High", color: "#f97316", icon: TrendingUp },
  { value: "medium", label: "Medium", color: "#3b82f6", icon: Zap },
  { value: "low", label: "Low", color: "#6b7280", icon: ChevronRight },
];

const VIEW_OPTIONS = [
  { value: "table", label: "Table", icon: Rows3 },
  { value: "cards", label: "Cards", icon: Grid3x3 },
  { value: "list", label: "List", icon: List },
];

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "list">("table");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "status">(
    "updated"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  // Bulk selection
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    new Set()
  );
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchCompanies();
  }, [page, debouncedSearch, statusFilter, priorityFilter, sortBy, sortOrder]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter.length && { status: statusFilter.join(",") }),
        ...(priorityFilter.length && { priority: priorityFilter.join(",") }),
      });

      const res = await fetch(`/api/companies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (
    company: Company,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !company.isFavorite }),
      });

      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === company.id ? { ...c, isFavorite: !c.isFavorite } : c
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleBulkExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCompanies.size > 0) {
        params.append("ids", Array.from(selectedCompanies).join(","));
      }

      const res = await fetch(`/api/companies/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `companies-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export companies:", error);
    }
  };

  const handleDelete = async (company: Company) => {
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
        setDeletingCompany(null);
      }
    } catch (error) {
      console.error("Failed to delete company:", error);
    }
  };

  const parseTags = (tags?: string): string[] => {
    if (!tags) return [];
    try {
      return JSON.parse(tags);
    } catch {
      return tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  };

  const getStatusOption = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  const getPriorityOption = (priority?: string) => {
    return (
      PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[3]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Calculate stats
  const activeCount = companies.filter((c) => c.status === "ACTIVE").length;
  const pendingCount = companies.filter((c) => c.status === "PENDING").length;
  const totalValue = companies.reduce((sum, c) => sum + (c.dealValue || 0), 0);
  const favoriteCount = companies.filter((c) => c.isFavorite).length;

  // Filter companies
  const filteredCompanies = companies.filter((company) => {
    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(company.status);
    const matchesPriority =
      priorityFilter.length === 0 ||
      priorityFilter.includes(company.priority || "");
    return matchesStatus && matchesPriority;
  });

  // Sort companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "updated":
        comparison =
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: "name" | "updated" | "status") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "oklch(0.94 0 0)" }}
    >
      {/* Header */}
      <div className="flex border-b px-6 py-2 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">
            {companies.length} total • {activeCount} active • {pendingCount}{" "}
            pending
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div
            className={`relative transition-all duration-300 ${
              searchFocused ? "w-80" : "w-64"
            }`}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="w-4 h-4 mr-2" />
                Filter
                {statusFilter.length + priorityFilter.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {statusFilter.length + priorityFilter.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 mb-2">STATUS</p>
                <div className="space-y-1">
                  {STATUS_OPTIONS.map((status) => (
                    <label
                      key={status.value}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={statusFilter.includes(status.value)}
                        onCheckedChange={(checked) => {
                          setStatusFilter((prev) =>
                            checked
                              ? [...prev, status.value]
                              : prev.filter((s) => s !== status.value)
                          );
                        }}
                      />
                      <status.icon
                        className="w-3.5 h-3.5"
                        style={{ color: status.color }}
                      />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  PRIORITY
                </p>
                <div className="space-y-1">
                  {PRIORITY_OPTIONS.map((priority) => (
                    <label
                      key={priority.value}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={priorityFilter.includes(priority.value)}
                        onCheckedChange={(checked) => {
                          setPriorityFilter((prev) =>
                            checked
                              ? [...prev, priority.value]
                              : prev.filter((p) => p !== priority.value)
                          );
                        }}
                      />
                      <priority.icon
                        className="w-3.5 h-3.5"
                        style={{ color: priority.color }}
                      />
                      <span className="text-sm">{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {statusFilter.length + priorityFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    onClick={() => {
                      setStatusFilter([]);
                      setPriorityFilter([]);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg bg-white p-1">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value as any)}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === option.value ? "bg-gray-100" : "hover:bg-gray-50"
                )}
                title={option.label}
              >
                <option.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Import Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportOpen(true)}
            className="h-10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>

          {/* Add Button */}
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#FF6B4A] h-10"
          >
            <Plus className="w-4 h-4" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCompanies.size > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedCompanies.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCompanies(new Set())}
              >
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => {
                  if (confirm(`Delete ${selectedCompanies.size} companies?`)) {
                    // Handle bulk delete
                  }
                }}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : sortedCompanies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              No companies found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Get started by adding your first company"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Company
              </Button>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox
                  checked={
                    selectedCompanies.size === sortedCompanies.length &&
                    sortedCompanies.length > 0
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCompanies(
                        new Set(sortedCompanies.map((c) => c.id))
                      );
                    } else {
                      setSelectedCompanies(new Set());
                    }
                  }}
                />
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Company
                </span>
                <button
                  onClick={() => handleSort("name")}
                  className="hover:bg-gray-200 p-0.5 rounded"
                >
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="col-span-3 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Contact
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Status
                </span>
                <button
                  onClick={() => handleSort("status")}
                  className="hover:bg-gray-200 p-0.5 rounded"
                >
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="col-span-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Priority
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Updated
                </span>
                <button
                  onClick={() => handleSort("updated")}
                  className="hover:bg-gray-200 p-0.5 rounded"
                >
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Body */}
            {sortedCompanies.map((company) => {
              const statusOption = getStatusOption(company.status);
              const priorityOption = getPriorityOption(company.priority);

              return (
                <div
                  key={company.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-100"
                  onMouseEnter={() => setHoveredRow(company.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() =>
                    router.push(`/dashboard/projects/${company.id}`)
                  }
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <Checkbox
                      checked={selectedCompanies.has(company.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedCompanies);
                        checked
                          ? newSelected.add(company.id)
                          : newSelected.delete(company.id);
                        setSelectedCompanies(newSelected);
                      }}
                    />
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0"
                      style={{ backgroundColor: company.color || "#222222" }}
                    >
                      {company.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {company.name}
                      </p>
                      {company.website && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {company.website.replace(/^https?:\/\//, "")}
                        </p>
                      )}
                    </div>
                    {company.isFavorite && (
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>

                  <div className="col-span-3">
                    {company.contactPerson ? (
                      <div>
                        <p className="text-sm text-gray-900">
                          {company.contactPerson}
                        </p>
                        {company.email && (
                          <p className="text-xs text-gray-500">
                            {company.email}
                          </p>
                        )}
                      </div>
                    ) : company.email ? (
                      <p className="text-sm text-gray-500">{company.email}</p>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <statusOption.icon
                        className="w-3.5 h-3.5"
                        style={{ color: statusOption.color }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: statusOption.color }}
                      >
                        {statusOption.label}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <div className="flex items-center gap-1.5">
                      <priorityOption.icon
                        className="w-3.5 h-3.5"
                        style={{ color: priorityOption.color }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: priorityOption.color }}
                      >
                        {priorityOption.label}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(company.updatedAt)}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <div
                      className={`flex items-center gap-1 transition-opacity opacity-100`}
                    >
                      <button
                        onClick={(e) => handleToggleFavorite(company, e)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        {company.isFavorite ? (
                          <StarOff className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                          <Star className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/projects/${company.id}`);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCompany(company);
                            }}
                            className="cursor-pointer"
                          >
                            <Pencil className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle duplicate
                            }}
                            className="cursor-pointer"
                          >
                            <Copy className="h-3 w-3 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingCompany(company);
                            }}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "cards" ? (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedCompanies.map((company) => {
              const statusOption = getStatusOption(company.status);
              const priorityOption = getPriorityOption(company.priority);

              return (
                <div
                  key={company.id}
                  className="bg-white rounded-lg border hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() =>
                    router.push(`/dashboard/projects/${company.id}`)
                  }
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                          style={{
                            backgroundColor: company.color || "#6b7280",
                          }}
                        >
                          {company.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {company.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <statusOption.icon
                              className="w-3 h-3"
                              style={{ color: statusOption.color }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: statusOption.color }}
                            >
                              {statusOption.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleToggleFavorite(company, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {company.isFavorite ? (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="w-4 h-4 text-gray-300 hover:text-yellow-400" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-3">
                      {company.contactPerson && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">
                            {company.contactPerson}
                          </span>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{company.email}</span>
                        </div>
                      )}
                      {company.dealValue && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span className="font-medium">
                            ${(company.dealValue / 1000).toFixed(0)}k
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-xs text-gray-500">
                        {formatDate(company.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <priorityOption.icon
                          className="w-3 h-3"
                          style={{ color: priorityOption.color }}
                        />
                        <span
                          className="text-xs"
                          style={{ color: priorityOption.color }}
                        >
                          {priorityOption.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {sortedCompanies.map((company) => {
              const statusOption = getStatusOption(company.status);
              const priorityOption = getPriorityOption(company.priority);

              return (
                <div
                  key={company.id}
                  className="bg-white rounded-lg border p-4 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/projects/${company.id}`)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium"
                        style={{ backgroundColor: company.color || "#6b7280" }}
                      >
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {company.name}
                          </h3>
                          {company.isFavorite && (
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1">
                            <statusOption.icon
                              className="w-3.5 h-3.5"
                              style={{ color: statusOption.color }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: statusOption.color }}
                            >
                              {statusOption.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <priorityOption.icon
                              className="w-3.5 h-3.5"
                              style={{ color: priorityOption.color }}
                            />
                            <span
                              className="text-sm"
                              style={{ color: priorityOption.color }}
                            >
                              {priorityOption.label}
                            </span>
                          </div>
                          {company.email && (
                            <span className="text-sm text-gray-500">
                              {company.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {formatDate(company.updatedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/projects/${company.id}`);
                        }}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CompanyDialog
        open={isCreateOpen || !!editingCompany}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCompany(null);
          }
        }}
        company={editingCompany}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditingCompany(null);
          fetchCompanies();
        }}
      />

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={() => {
          setIsImportOpen(false);
          fetchCompanies();
        }}
      />

      <DeleteDialog
        open={!!deletingCompany}
        onOpenChange={(open) => !open && setDeletingCompany(null)}
        onConfirm={() => deletingCompany && handleDelete(deletingCompany)}
        title="Delete Company"
        description={`Are you sure you want to delete ${deletingCompany?.name}? This action cannot be undone.`}
      />
    </div>
  );
}
