"use client";

import { Fragment, useState, DragEvent } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Download,
  Link2,
  Eye,
  Building2,
  Trash2,
  Edit2,
  Move,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Folder, Document } from "@/types/documents";

interface FolderTreeProps {
  folders: Folder[];
  documents: Document[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (folderId: string) => void;
  onFolderToggle: (folderId: string) => void;
  onFolderEdit: (folder: Folder) => void;
  onFolderDelete: (folderId: string) => void;
  onFolderMove?: (folderId: string, targetParentId: string | null) => void;
  onDocumentDownload: (document: Document) => void;
  onDocumentMove: (document: Document) => void;
  onDocumentLink: (document: Document) => void;
  onDocumentDelete: (documentId: string) => void;
  onDocumentDrop?: (documentId: string, targetFolderId: string) => void;
  onFilesDrop?: (files: FileList, targetFolderId: string) => void;
}

export function FolderTree({
  folders,
  documents,
  selectedFolderId,
  expandedFolders,
  onFolderSelect,
  onFolderToggle,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
  onDocumentDownload,
  onDocumentMove,
  onDocumentLink,
  onDocumentDelete,
  onDocumentDrop,
  onFilesDrop,
}: FolderTreeProps) {
  const [draggedItem, setDraggedItem] = useState<{
    type: "folder" | "document";
    id: string;
  } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

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

  // Check if a folder is a descendant of another
  const isDescendant = (
    folderId: string,
    potentialAncestorId: string
  ): boolean => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return false;
    if (folder.parentId === potentialAncestorId) return true;
    if (folder.parentId)
      return isDescendant(folder.parentId, potentialAncestorId);
    return false;
  };

  // Handle folder drag start
  const handleFolderDragStart = (e: DragEvent, folder: Folder) => {
    if (folder.isSystemFolder) return; // Don't allow dragging system folders

    setDraggedItem({ type: "folder", id: folder.id });
    e.dataTransfer.effectAllowed = "move";

    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  // Handle document drag start
  const handleDocumentDragStart = (e: DragEvent, document: Document) => {
    setDraggedItem({ type: "document", id: document.id });
    e.dataTransfer.effectAllowed = "move";

    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  // Handle drag end (cleanup)
  const handleDragEnd = (e: DragEvent) => {
    setDraggedItem(null);
    setDragOverFolder(null);
    setIsDraggingFile(false);

    // Remove visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  // Handle drag over folder
  const handleFolderDragOver = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if this is a valid drop target
    if (draggedItem?.type === "folder") {
      // Can't drop a folder into itself or its descendants
      if (
        draggedItem.id === folderId ||
        isDescendant(folderId, draggedItem.id)
      ) {
        e.dataTransfer.dropEffect = "none";
        return;
      }
    }

    e.dataTransfer.dropEffect = "move";
    setDragOverFolder(folderId);
  };

  // Handle drag leave
  const handleDragLeave = (e: DragEvent) => {
    // Only clear if we're leaving the folder entirely
    if (e.currentTarget === e.target) {
      setDragOverFolder(null);
    }
  };

  // Handle drop on folder
  const handleFolderDrop = (e: DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Handle file drops from outside
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDrop) {
        onFilesDrop(e.dataTransfer.files, targetFolderId);
      }
      setDragOverFolder(null);
      setIsDraggingFile(false);
      return;
    }

    // Handle internal drag and drop
    if (!draggedItem) return;

    if (draggedItem.type === "folder") {
      // Move folder
      if (onFolderMove && draggedItem.id !== targetFolderId) {
        const draggedFolder = folders.find((f) => f.id === draggedItem.id);
        if (draggedFolder && !isDescendant(targetFolderId, draggedItem.id)) {
          onFolderMove(draggedItem.id, targetFolderId);
        }
      }
    } else if (draggedItem.type === "document") {
      // Move document
      if (onDocumentDrop) {
        const document = documents.find((d) => d.id === draggedItem.id);
        if (document && document.folderId !== targetFolderId) {
          onDocumentDrop(draggedItem.id, targetFolderId);
        }
      }
    }

    setDraggedItem(null);
    setDragOverFolder(null);
  };

  // Handle file drag enter from outside
  const handleFileDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  };

  // Handle file drag leave
  const handleFileDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
      setDragOverFolder(null);
    }
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0 || folder.documentCount > 0;
    const folderDocuments = documents.filter(
      (doc) => doc.folderId === folder.id
    );
    const isDragOver = dragOverFolder === folder.id;

    return (
      <Fragment key={folder.id}>
        {/* Folder Row */}
        <div
          className={`grid grid-cols-12 gap-4 px-6 py-3 transition-colors cursor-pointer group items-center border-b border-gray-100 ${
            isSelected ? "bg-gray-50" : "hover:bg-gray-50/50"
          } ${isDragOver ? "bg-blue-50 border-blue-300" : ""}`}
          style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}
          onClick={() => {
            if (hasChildren) {
              onFolderToggle(folder.id);
            }
            onFolderSelect(folder.id);
          }}
          draggable={!folder.isSystemFolder}
          onDragStart={(e) => handleFolderDragStart(e, folder)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleFolderDrop(e, folder.id)}
        >
          <div className="col-span-5 flex items-center gap-3">
            {!folder.isSystemFolder && (
              <GripVertical className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 cursor-move -ml-4" />
            )}

            <button
              className="p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) {
                  onFolderToggle(folder.id);
                }
              }}
            >
              {!hasChildren ? (
                <div className="h-4 w-4" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {isExpanded ? (
              <FolderOpen
                className="h-4 w-4"
                style={{ color: folder.color || "#FF6B4A" }}
              />
            ) : (
              <Folder
                className="h-4 w-4"
                style={{ color: folder.color || "#6b7280" }}
              />
            )}

            <span className="text-sm font-medium text-gray-900">
              {folder.name}
              {isDragOver && draggedItem && (
                <span className="ml-2 text-xs text-blue-600">Drop here</span>
              )}
            </span>

            {folder.isSystemFolder && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                System
              </span>
            )}
          </div>

          <div className="col-span-2">
            <span className="text-sm text-gray-500">
              {folder.documentCount || "—"}
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-sm text-gray-500">
              {folder.totalSize > 0 ? formatFileSize(folder.totalSize) : "—"}
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-sm text-gray-500">
              {formatDate(folder.lastModifiedAt || folder.updatedAt)}
            </span>
          </div>

          <div className="col-span-1 flex justify-end">
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
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderEdit(folder);
                  }}
                  className="cursor-pointer"
                >
                  <Edit2 className="h-3 w-3 mr-2" />
                  Edit Folder
                </DropdownMenuItem>

                {!folder.isSystemFolder && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onFolderDelete(folder.id);
                      }}
                      className="text-red-600 cursor-pointer"
                      disabled={
                        folder.documentCount > 0 || folder.children.length > 0
                      }
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete Folder
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Documents in folder */}
        {isExpanded &&
          folderDocuments.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-50"
              style={{
                backgroundColor: "oklch(0.985 0 0)",
                paddingLeft: `${3 + level * 1.5}rem`,
              }}
              draggable
              onDragStart={(e) => handleDocumentDragStart(e, doc)}
              onDragEnd={handleDragEnd}
            >
              <div className="col-span-5 flex items-center gap-3">
                <GripVertical className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 cursor-move -ml-4" />
                <div className="h-4 w-4" /> {/* Spacer */}
                <FileText className="size-3.5 text-[#FF6B4A]" />
                <span className="text-sm text-gray-700">{doc.fileName}</span>
                {doc.isTemplate && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    Template
                  </span>
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
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDocumentDownload(doc)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                  </button>

                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/dashboard/documents/${doc.id}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Copy link"
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
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                        className="cursor-pointer"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Preview
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onDocumentMove(doc)}
                        className="cursor-pointer"
                      >
                        <Move className="h-3 w-3 mr-2" />
                        Move to Folder
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onDocumentLink(doc)}
                        className="cursor-pointer"
                      >
                        <Building2 className="h-3 w-3 mr-2" />
                        Link Companies
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => onDocumentDelete(doc.id)}
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

        {/* Render child folders */}
        {isExpanded &&
          folder.children.map((childFolder) =>
            renderFolder(childFolder, level + 1)
          )}
      </Fragment>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden relative ${
        isDraggingFile ? "ring-2 ring-blue-500 ring-offset-2" : ""
      }`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      onDragEnter={handleFileDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleFileDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
      }}
    >
      {/* Drag overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <FolderOpen className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-medium text-blue-700">
              Drop files here to upload
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Files will be uploaded to the selected folder
            </p>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="col-span-5 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
            Name
          </span>
        </div>
        <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
          Files
        </div>
        <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
          Size
        </div>
        <div className="col-span-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
          Modified
        </div>
        <div className="col-span-1" />
      </div>

      {/* Folders */}
      {folders.map((folder) => renderFolder(folder))}
    </div>
  );
}
