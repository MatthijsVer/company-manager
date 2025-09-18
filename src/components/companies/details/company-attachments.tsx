"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  MoreVertical,
  Search,
  User,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  Trash2,
  Eye,
  Star,
  Edit,
  Share2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  FolderPlus,
} from "lucide-react";

interface Attachment {
  id: string;
  companyId: string;
  uploadedBy: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileUrl: string;
  mimeType: string;
  description: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    email: string;
  };
}

interface CompanyAttachmentsProps {
  companyId: string;
  attachments?: Attachment[];
  onUpdate?: () => void;
}

export function CompanyAttachments({
  companyId,
  attachments: initialAttachments,
  onUpdate,
}: CompanyAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialAttachments || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(!initialAttachments);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch attachments if not provided
  useEffect(() => {
    if (!initialAttachments) {
      fetchAttachments();
    }
  }, [companyId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/companies/${companyId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.startsWith("video/")) return FileVideo;
    if (mimeType.startsWith("audio/")) return FileAudio;
    if (mimeType.includes("pdf")) return FileText;
    if (mimeType.includes("sheet") || mimeType.includes("excel"))
      return FileSpreadsheet;
    if (
      mimeType.includes("javascript") ||
      mimeType.includes("json") ||
      mimeType.includes("xml") ||
      fileName.endsWith(".js") ||
      fileName.endsWith(".ts") ||
      fileName.endsWith(".jsx") ||
      fileName.endsWith(".tsx")
    )
      return FileCode;
    return File;
  };

  // Group attachments by category
  const groupedAttachments = attachments.reduce(
    (acc, attachment) => {
      const category = attachment.category || "uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(attachment);
      return acc;
    },
    {} as Record<string, Attachment[]>
  );

  // Get all categories (folders)
  const allCategories = Object.keys(groupedAttachments).sort();

  // Toggle folder expansion
  const toggleFolder = (category: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedFolders(newExpanded);
  };

  // Download file
  const downloadFile = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  // Delete attachment
  const deleteAttachment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`/api/companies/${companyId}/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!uploadFile || !uploadCategory) {
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("category", uploadCategory);
      if (uploadDescription) {
        formData.append("description", uploadDescription);
      }

      const res = await fetch(`/api/companies/${companyId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        setAttachments((prev) => [...prev, newDoc]);
        setIsUploadDialogOpen(false);
        setUploadFile(null);
        setUploadCategory("");
        setUploadDescription("");
        onUpdate?.();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploading(false);
    }
  };

  // Filter attachments
  const filteredGroupedAttachments = Object.entries(groupedAttachments).reduce(
    (acc, [category, files]) => {
      const filteredFiles = files.filter((file) =>
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filteredFiles.length > 0) {
        acc[category] = filteredFiles;
      }
      return acc;
    },
    {} as Record<string, Attachment[]>
  );

  // Expand all folders when searching
  useEffect(() => {
    if (searchQuery) {
      setExpandedFolders(new Set(Object.keys(filteredGroupedAttachments)));
    } else {
      setExpandedFolders(new Set());
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="bg-card rounded-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Documents & Files
            </h2>{" "}
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setIsNewFolderDialogOpen(true)}
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                New Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
            </div>
          </div>
        </div>

        {/* File System */}
        <div className="px-4 pb-4">
          {Object.keys(filteredGroupedAttachments).length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No files found" : "No files yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(filteredGroupedAttachments).map(
                ([category, files]) => {
                  const isExpanded = expandedFolders.has(category);
                  const formatCategoryName = (cat: string) => {
                    return (
                      cat.charAt(0).toUpperCase() +
                      cat.slice(1).replace(/_/g, " ")
                    );
                  };

                  return (
                    <div key={category}>
                      {/* Folder Row */}
                      <div
                        className="flex items-center gap-2 py-2 pr-2 hover:bg-muted/30 rounded cursor-pointer group"
                        onClick={() => toggleFolder(category)}
                      >
                        <button className="p-0.5">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded ? (
                          <FolderOpen className="h-5 w-5 text-[#FF6B4A]" />
                        ) : (
                          <Folder className="h-5 w-5 text-[#FF6B4A]" />
                        )}
                        <span className="text-sm font-medium flex-1">
                          {formatCategoryName(category)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {files.length} {files.length === 1 ? "file" : "files"}
                        </span>
                      </div>

                      {/* Files in Folder */}
                      {isExpanded && (
                        <div className="ml-6">
                          <table className="w-full">
                            <tbody>
                              {files.map((attachment) => {
                                const FileIcon = getFileIcon(
                                  attachment.mimeType,
                                  attachment.fileName
                                );

                                return (
                                  <tr
                                    key={attachment.id}
                                    className="hover:bg-muted/20 transition-colors group"
                                  >
                                    <td className="py-2 pl-4">
                                      <div className="flex items-center gap-3">
                                        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm truncate max-w-[300px]">
                                          {attachment.fileName}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-[#1F1F1F] text-white text-xs font-medium flex items-center justify-center">
                                          {attachment.user.name[0]}
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                          {attachment.user.name ||
                                            attachment.user.email}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2">
                                      <span className="text-sm text-muted-foreground">
                                        {formatDate(attachment.updatedAt)}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      <span className="text-sm text-muted-foreground">
                                        {formatFileSize(attachment.fileSize)}
                                      </span>
                                    </td>
                                    <td className="py-2">
                                      <div className="flex ml-auto items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            window.open(
                                              attachment.fileUrl,
                                              "_blank"
                                            )
                                          }
                                        >
                                          <Share2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() =>
                                            downloadFile(attachment)
                                          }
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() =>
                                                window.open(
                                                  attachment.fileUrl,
                                                  "_blank"
                                                )
                                              }
                                            >
                                              <Eye className="h-4 w-4 mr-2" />
                                              Preview
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                downloadFile(attachment)
                                              }
                                            >
                                              <Download className="h-4 w-4 mr-2" />
                                              Download
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                deleteAttachment(attachment.id)
                                              }
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a new file to this company's documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() +
                        category.slice(1).replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                  <SelectItem value={newFolderName || "new_folder"}>
                    + Create new folder
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your files
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
              placeholder="e.g., contracts, invoices"
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
            <Button
              onClick={() => {
                if (newFolderName) {
                  setUploadCategory(newFolderName);
                  setIsNewFolderDialogOpen(false);
                  setIsUploadDialogOpen(true);
                }
              }}
              disabled={!newFolderName}
            >
              Create & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
