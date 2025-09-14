"use client";

import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  X,
  ChevronRight,
  ChevronDown,
  Download,
  Link2,
  Trash2,
  Star,
  StarOff,
  Eye,
  Building2,
  Folder,
  Upload,
  Check,
  FolderOpen,
  FileText,
  Filter,
  FolderPlus,
  ArrowUpDown,
  Edit2,
} from "lucide-react";

interface OrganizationDocument {
  id: string;
  organizationId: string;
  uploadedBy: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  description: string | null;
  tags: string[];
  isStarred: boolean;
  isTemplate: boolean;
  sharedWith: string[];
  metadata: {
    version?: number;
    linkedCompanies?: string[];
    permissions?: any;
  };
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  companies?: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
}

interface Company {
  id: string;
  name: string;
  color: string | null;
  slug: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<OrganizationDocument[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  // Dialog states
  const [isUploadPopoverOpen, setIsUploadPopoverOpen] = useState(false);
  const [isLinkCompanyDialogOpen, setIsLinkCompanyDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isRenameFolderDialogOpen, setIsRenameFolderDialogOpen] =
    useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<OrganizationDocument | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Upload states
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadIsTemplate, setUploadIsTemplate] = useState(false);
  const [uploadLinkedCompanies, setUploadLinkedCompanies] = useState<string[]>(
    []
  );
  const [uploading, setUploading] = useState(false);

  // New folder state
  const [newFolderName, setNewFolderName] = useState("");

  // Link company states
  const [selectedCompaniesToLink, setSelectedCompaniesToLink] = useState<
    string[]
  >([]);

  useEffect(() => {
    fetchDocuments();
    fetchCompanies();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/organization/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/companies?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getFileType = (mimeType: string, fileName: string) => {
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLSX";
    if (mimeType.includes("word")) return "DOC";
    if (mimeType.startsWith("image/")) return "IMG";
    if (mimeType.startsWith("video/")) return "VIDEO";
    const ext = fileName.split(".").pop()?.toUpperCase();
    return ext || "FILE";
  };

  const toggleStarred = async (
    doc: OrganizationDocument,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/organization/documents/${doc.id}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !doc.isStarred }),
      });

      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id ? { ...d, isStarred: !d.isStarred } : d
          )
        );
        toast.success(
          doc.isStarred ? "Removed from favorites" : "Added to favorites"
        );
      }
    } catch (error) {
      console.error("Failed to toggle star:", error);
      toast.error("Failed to update favorite status");
    }
  };

  const downloadFile = async (
    doc: OrganizationDocument,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const response = await fetch(doc.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download file:", error);
      toast.error("Failed to download file");
    }
  };

  const deleteDocument = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this file? This cannot be undone."
      )
    )
      return;

    try {
      const res = await fetch(`/api/organization/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        toast.success("Document deleted");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadCategory) {
      toast.error("Please select a file and category");
      return;
    }

    try {
      setUploading(true);

      // If creating a new category, handle that first
      let categoryToUse = uploadCategory;
      if (uploadCategory === "new") {
        const newCategoryName = prompt("Enter a name for the new category:");
        if (!newCategoryName) {
          setUploading(false);
          return;
        }

        const normalizedName = newCategoryName
          .toLowerCase()
          .replace(/\s+/g, "_");

        // Create the new category first
        const catRes = await fetch("/api/organization/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: normalizedName,
            description: null,
          }),
        });

        if (!catRes.ok) {
          const error = await catRes.json();
          toast.error(error.error || "Failed to create category");
          setUploading(false);
          return;
        }

        categoryToUse = normalizedName;
        await fetchCategories(); // Refresh categories list
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", categoryToUse);
      if (uploadDescription) formData.append("description", uploadDescription);
      formData.append("isTemplate", uploadIsTemplate.toString());
      if (uploadLinkedCompanies.length > 0) {
        formData.append(
          "linkedCompanies",
          JSON.stringify(uploadLinkedCompanies)
        );
      }

      const res = await fetch("/api/organization/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments((prev) => [newDoc, ...prev]);
        toast.success("Document uploaded successfully");
        resetUploadPopover();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) {
      toast.error("Please enter a folder name");
      return;
    }

    try {
      const res = await fetch("/api/organization/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          description: null,
        }),
      });

      if (res.ok) {
        toast.success(`Folder "${newFolderName}" created successfully`);
        // Refresh categories and update categoryData
        await fetchCategories();
        setIsNewFolderDialogOpen(false);
        setNewFolderName("");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create folder");
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast.error("Failed to create folder");
    }
  };

  const handleDeleteFolder = async (categoryName: string) => {
    if (
      !confirm(`Are you sure you want to delete the folder "${categoryName}"?`)
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/organization/categories?name=${encodeURIComponent(categoryName)}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        toast.success(`Folder "${categoryName}" deleted`);
        await fetchCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete folder");
      }
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleRenameFolder = async () => {
    if (!newFolderName || !selectedFolder) return;

    try {
      const res = await fetch(
        `/api/organization/categories/${encodeURIComponent(selectedFolder)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName: newFolderName }),
        }
      );

      if (res.ok) {
        toast.success(`Folder renamed to "${newFolderName}"`);
        await fetchCategories();
        await fetchDocuments(); // Refresh documents in case any were in this category
        setIsRenameFolderDialogOpen(false);
        setNewFolderName("");
        setSelectedFolder(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to rename folder");
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
      toast.error("Failed to rename folder");
    }
  };

  const handleLinkCompanies = async () => {
    if (!selectedDocument || selectedCompaniesToLink.length === 0) return;

    try {
      const res = await fetch(
        `/api/organization/documents/${selectedDocument.id}/link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyIds: selectedCompaniesToLink }),
        }
      );

      if (res.ok) {
        const updatedDoc = await res.json();
        setDocuments((prev) =>
          prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
        );
        toast.success("Document linked to companies");
        setIsLinkCompanyDialogOpen(false);
        setSelectedCompaniesToLink([]);
      }
    } catch (error) {
      console.error("Failed to link companies:", error);
      toast.error("Failed to link companies");
    }
  };

  const copyLink = (doc: OrganizationDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard/documents/${doc.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const resetUploadPopover = () => {
    setIsUploadPopoverOpen(false);
    setUploadFile(null);
    setUploadCategory("");
    setUploadDescription("");
    setUploadIsTemplate(false);
    setUploadLinkedCompanies([]);
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || doc.category === categoryFilter;
    const matchesTemplate = !showTemplatesOnly || doc.isTemplate;

    return matchesSearch && matchesCategory && matchesTemplate;
  });

  // Get unique categories with counts and latest modified
  const categoryData = documents.reduce(
    (acc, doc) => {
      const cat = doc.category || "uncategorized";
      if (!acc[cat]) {
        acc[cat] = {
          count: 0,
          size: 0,
          latestModified: doc.updatedAt,
          docs: [],
        };
      }
      acc[cat].count++;
      acc[cat].size += doc.fileSize;
      acc[cat].docs.push(doc);
      if (new Date(doc.updatedAt) > new Date(acc[cat].latestModified)) {
        acc[cat].latestModified = doc.updatedAt;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        count: number;
        size: number;
        latestModified: string;
        docs: OrganizationDocument[];
      }
    >
  );

  // Add empty categories from the categories list
  categories.forEach((cat) => {
    if (!categoryData[cat]) {
      categoryData[cat] = {
        count: 0,
        size: 0,
        latestModified: new Date().toISOString(),
        docs: [],
      };
    }
  });

  const allCategories = Object.keys(categoryData).sort();

  // Group filtered documents by category
  const groupedDocuments = filteredDocuments.reduce(
    (acc, doc) => {
      const category = doc.category || "uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(doc);
      return acc;
    },
    {} as Record<string, OrganizationDocument[]>
  );

  // Stats
  const totalStorage = documents.reduce((sum, d) => sum + d.fileSize, 0);
  const templateCount = documents.filter((d) => d.isTemplate).length;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "oklch(0.94 0 0)" }}
    >
      <div className="flex border-b px-6 py-2 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} files • {formatFileSize(totalStorage)} used
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div
            className={`relative transition-all duration-300 ${searchFocused ? "w-80" : "w-64"}`}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A] focus:border-[#FF6B4A] transition-all"
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
                {(categoryFilter !== "all" || showTemplatesOnly) && (
                  <span className="ml-2 px-1.5 py-0.5 bg-[#FF6B4A] text-white text-xs rounded-full">
                    {(categoryFilter !== "all" ? 1 : 0) +
                      (showTemplatesOnly ? 1 : 0)}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  CATEGORY
                </p>
                <div className="space-y-1">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 flex items-center justify-between ${
                      categoryFilter === "all" ? "bg-gray-100 font-medium" : ""
                    }`}
                  >
                    All Categories
                    {categoryFilter === "all" && <Check className="w-3 h-3" />}
                  </button>
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm hover:bg-gray-100 flex items-center justify-between ${
                        categoryFilter === cat ? "bg-gray-100 font-medium" : ""
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() +
                        cat.slice(1).replace(/_/g, " ")}
                      {categoryFilter === cat && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 mb-2">TYPE</p>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
                  <Checkbox
                    checked={showTemplatesOnly}
                    onCheckedChange={(checked) =>
                      setShowTemplatesOnly(checked as boolean)
                    }
                  />
                  <span className="text-sm">Templates only</span>
                </label>
              </div>
              {(categoryFilter !== "all" || showTemplatesOnly) && (
                <>
                  <DropdownMenuSeparator />
                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setShowTemplatesOnly(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upload Popover */}
          <Popover
            open={isUploadPopoverOpen}
            onOpenChange={setIsUploadPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white h-10">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="p-4 border-b">
                <h3 className="font-medium">Upload Document</h3>
                <p className="text-sm text-gray-500">
                  Add a new file to your organization
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="file" className="text-sm">
                    File
                  </Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm">
                    Category
                  </Label>
                  <Select
                    value={uploadCategory}
                    onValueChange={setUploadCategory}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() +
                            cat.slice(1).replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ Create new category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="description"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="mt-1.5"
                    rows={2}
                    placeholder="Add a description..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="template"
                    checked={uploadIsTemplate}
                    onCheckedChange={(checked) =>
                      setUploadIsTemplate(checked as boolean)
                    }
                  />
                  <Label htmlFor="template" className="text-sm">
                    Mark as template
                  </Label>
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUploadPopover}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : Object.keys(categoryData).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">
              No documents found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? "Try adjusting your search"
                : "Create a folder or upload your first document to get started"}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                onClick={() => setIsNewFolderDialogOpen(true)}
                variant="outline"
                className="inline-flex items-center"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Button
                onClick={() => setIsUploadPopoverOpen(true)}
                className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 inline-flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        ) : (
          /* Table with Header */
          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="col-span-5 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Name
                </span>
                <button className="hover:bg-gray-200 p-0.5 rounded">
                  <ArrowUpDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <div className="col-span-2 flex items-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                Files
              </div>
              <div className="col-span-2 text-xs flex items-center font-medium text-gray-600 uppercase tracking-wider">
                Size
              </div>
              <div className="col-span-2 text-xs flex items-center font-medium text-gray-600 uppercase tracking-wider">
                Modified
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => setIsNewFolderDialogOpen(true)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Create new folder"
                >
                  <FolderPlus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Folders and Documents */}
            {Object.keys(categoryData)
              .sort()
              .map((category, idx) => {
                const catData = categoryData[category];
                const categoryDocs = filteredDocuments.filter(
                  (doc) => (doc.category || "uncategorized") === category
                );
                const isExpanded = expandedCategories.has(category);
                const isEmpty = catData.count === 0;

                return (
                  <div key={category}>
                    {/* Folder Row */}
                    <div
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-100"
                      onMouseEnter={() => setHoveredFolder(category)}
                      onMouseLeave={() => setHoveredFolder(null)}
                      onClick={() => {
                        if (!isEmpty) {
                          const newExpanded = new Set(expandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(category);
                          } else {
                            newExpanded.add(category);
                          }
                          setExpandedCategories(newExpanded);
                        }
                      }}
                    >
                      <div className="col-span-5 flex items-center gap-3">
                        <button
                          className="p-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEmpty ? (
                            <div className="h-4 w-4" />
                          ) : isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        {isEmpty ? (
                          <Folder className="h-4 w-4 text-gray-400" />
                        ) : isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-[#FF6B4A]" />
                        ) : (
                          <Folder className="h-4 w-4 text-gray-600" />
                        )}
                        <span
                          className={`text-sm font-medium ${isEmpty ? "text-gray-400" : "text-gray-900"}`}
                        >
                          {category.charAt(0).toUpperCase() +
                            category.slice(1).replace(/_/g, " ")}
                        </span>
                        {isEmpty && (
                          <span className="text-xs text-gray-400 italic">
                            (empty)
                          </span>
                        )}
                      </div>

                      <div className="col-span-2">
                        <span className="text-sm text-gray-500">
                          {catData.count || "—"}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-sm text-gray-500">
                          {catData.count > 0
                            ? formatFileSize(catData.size)
                            : "—"}
                        </span>
                      </div>

                      <div className="col-span-2">
                        <span className="text-sm text-gray-500">
                          {catData.count > 0
                            ? formatDate(catData.latestModified)
                            : "—"}
                        </span>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        {hoveredFolder === category && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {isEmpty ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFolder(category);
                                      setNewFolderName(category);
                                      setIsRenameFolderDialogOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Edit2 className="h-3 w-3 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(category);
                                    }}
                                    className="text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete Folder
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  disabled
                                  className="text-gray-400"
                                >
                                  <X className="h-3 w-3 mr-2" />
                                  Folder contains files
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Expanded Documents */}
                    {isExpanded &&
                      !isEmpty &&
                      categoryDocs.map((doc, docIdx) => (
                        <div
                          key={doc.id}
                          className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-50"
                          style={{
                            backgroundColor: "oklch(0.985 0 0)",
                          }}
                          onMouseEnter={() => setHoveredDoc(doc.id)}
                          onMouseLeave={() => setHoveredDoc(null)}
                        >
                          <div className="col-span-5 flex items-center gap-3 pl-12">
                            <FileText className="size-3.5 -mr-1 text-[#FF6B4A]" />
                            <span className="text-sm text-gray-700">
                              {doc.fileName}
                            </span>
                            {doc.isStarred && (
                              <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>

                          <div className="col-span-2">
                            <span className="text-sm text-gray-500 font-mono">
                              {getFileType(doc.mimeType, doc.fileName)}
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className="text-sm text-gray-500">
                              {formatFileSize(doc.fileSize)}
                            </span>
                          </div>

                          <div className="col-span-2">
                            <span className="text-sm text-gray-500">
                              {formatDate(doc.updatedAt)}
                            </span>
                          </div>

                          <div className="col-span-1 flex justify-end">
                            <div
                              className={`flex items-center gap-1 transition-opacity ${
                                hoveredDoc === doc.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            >
                              <button
                                onClick={(e) => toggleStarred(doc, e)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              >
                                {doc.isStarred ? (
                                  <StarOff className="w-3.5 h-3.5 text-gray-500" />
                                ) : (
                                  <Star className="w-3.5 h-3.5 text-gray-500" />
                                )}
                              </button>
                              <button
                                onClick={(e) => downloadFile(doc, e)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Download className="w-3.5 h-3.5 text-gray-500" />
                              </button>
                              <button
                                onClick={(e) => copyLink(doc, e)}
                                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                              >
                                <Link2 className="w-3.5 h-3.5 text-gray-500" />
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
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(doc.fileUrl, "_blank");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Eye className="h-3 w-3 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDocument(doc);
                                      setIsLinkCompanyDialogOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Building2 className="h-3 w-3 mr-2" />
                                    Link Companies
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteDocument(doc.id);
                                    }}
                                    className="text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder (category)
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) =>
                setNewFolderName(
                  e.target.value.toLowerCase().replace(/\s+/g, "_")
                )
              }
              placeholder="e.g., contracts, templates"
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewFolderDialogOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={isRenameFolderDialogOpen}
        onOpenChange={setIsRenameFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="renameFolderName">New Folder Name</Label>
            <Input
              id="renameFolderName"
              value={newFolderName}
              onChange={(e) =>
                setNewFolderName(
                  e.target.value.toLowerCase().replace(/\s+/g, "_")
                )
              }
              placeholder="e.g., contracts, templates"
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameFolderDialogOpen(false);
                setNewFolderName("");
                setSelectedFolder(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!newFolderName || newFolderName === selectedFolder}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Company Dialog */}
      <Dialog
        open={isLinkCompanyDialogOpen}
        onOpenChange={setIsLinkCompanyDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Companies</DialogTitle>
            <DialogDescription>
              Select companies to share this document with
            </DialogDescription>
          </DialogHeader>

          <Command>
            <CommandInput placeholder="Search companies..." />
            <CommandEmpty>No companies found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[300px]">
                {companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    onSelect={() => {
                      setSelectedCompaniesToLink((prev) =>
                        prev.includes(company.id)
                          ? prev.filter((id) => id !== company.id)
                          : [...prev, company.id]
                      );
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        selectedCompaniesToLink.includes(company.id)
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                    />
                    <div
                      className="h-2 w-2 rounded-full mr-2"
                      style={{ backgroundColor: company.color || "#999" }}
                    />
                    {company.name}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkCompanyDialogOpen(false);
                setSelectedCompaniesToLink([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkCompanies}
              disabled={selectedCompaniesToLink.length === 0}
            >
              Link {selectedCompaniesToLink.length}{" "}
              {selectedCompaniesToLink.length === 1 ? "Company" : "Companies"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
