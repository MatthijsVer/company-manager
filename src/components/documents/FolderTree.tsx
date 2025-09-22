"use client";

import { Fragment, useEffect, useRef, useState, DragEvent } from "react";
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
  FilePlus,
  Upload as UploadIcon,
  FolderPlus,
  X,
  KeyRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import type { Folder as FolderType, Document } from "@/types/documents";
import { useRouter } from "next/navigation";
import { AccessDialog, AccessMini } from "./AccessDialog";

interface FolderTreeProps {
  folders: FolderType[];
  documents: Document[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  onFolderSelect: (folderId: string) => void;
  onFolderToggle: (folderId: string) => void;
  onFolderEdit: (folder: FolderType) => void;
  onFolderDelete: (folderId: string) => void;
  onFolderMove?: (folderId: string, targetParentId: string | null) => void;
  onDocumentDownload: (document: Document) => void;
  onDocumentMove: (document: Document) => void;
  onDocumentLink: (document: Document) => void;
  onDocumentDelete: (documentId: string) => void;
  onDocumentDrop?: (documentId: string, targetFolderId: string) => void;
  onFilesDrop?: (files: FileList, targetFolderId: string) => void;

  // Actions operating inside a specific folder
  onCreateFileInFolder: (folderId: string) => void;
  onUploadInFolder: (folderId: string) => void;

  // UPDATED: inline subfolder creation (returns when server finished)
  onCreateSubfolder: (parentFolderId: string, name: string) => Promise<void>;
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
  onCreateFileInFolder,
  onUploadInFolder,
  onCreateSubfolder,
}: FolderTreeProps) {
  const [draggedItem, setDraggedItem] = useState<{
    type: "folder" | "document";
    id: string;
  } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Inline subfolder creation state
  const [creatingUnderFolderId, setCreatingUnderFolderId] = useState<
    string | null
  >(null);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [creatingBusy, setCreatingBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessEntity, setAccessEntity] = useState<"folder" | "document">(
    "folder"
  );
  const [accessEntityId, setAccessEntityId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    if (creatingUnderFolderId) {
      // Focus input when row appears
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [creatingUnderFolderId]);

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

  function openAccess(entity: "folder" | "document", id: string) {
    setAccessEntity(entity);
    setAccessEntityId(id);
    setAccessOpen(true);
  }

  const findFolderById = (
    folderId: string,
    folderList: FolderType[] = folders
  ): FolderType | undefined => {
    for (const folder of folderList) {
      if (folder.id === folderId) return folder;
      if (folder.children.length > 0) {
        const found = findFolderById(folderId, folder.children);
        if (found) return found;
      }
    }
    return undefined;
  };

  const isDescendant = (
    folderId: string,
    potentialAncestorId: string
  ): boolean => {
    const folder = findFolderById(folderId);
    if (!folder) return false;
    if (folder.parentId === potentialAncestorId) return true;
    if (folder.parentId)
      return isDescendant(folder.parentId, potentialAncestorId);
    return false;
  };

  const handleFolderDragStart = (e: DragEvent, folder: FolderType) => {
    if (folder.isSystemFolder) {
      e.preventDefault();
      return;
    }
    setDraggedItem({ type: "folder", id: folder.id });
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDocumentDragStart = (e: DragEvent, document: Document) => {
    setDraggedItem({ type: "document", id: document.id });
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: DragEvent) => {
    setDraggedItem(null);
    setDragOverFolder(null);
    setIsDraggingFile(false);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleFolderDragOver = (e: DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItem?.type === "folder") {
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

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOverFolder(null);
    }
  };

  const handleFolderDrop = (e: DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // External file(s) dropped into folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onFilesDrop) onFilesDrop(e.dataTransfer.files, targetFolderId);
      setDragOverFolder(null);
      setIsDraggingFile(false);
      return;
    }

    // Internal drag
    if (!draggedItem) return;

    if (draggedItem.type === "folder") {
      if (onFolderMove && draggedItem.id !== targetFolderId) {
        const draggedFolder = findFolderById(draggedItem.id);
        const wouldCreateCircularRef = isDescendant(
          targetFolderId,
          draggedItem.id
        );
        if (draggedFolder && !wouldCreateCircularRef) {
          onFolderMove(draggedItem.id, targetFolderId);
        }
      }
    } else if (draggedItem.type === "document") {
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

  const handleFileDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  };

  const handleFileDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
      setDragOverFolder(null);
    }
  };

  // Begin inline subfolder creation under given parent
  const beginInlineSubfolder = (parentId: string) => {
    // ensure parent is expanded so the inline row is visible
    if (!expandedFolders.has(parentId)) {
      onFolderToggle(parentId);
    }
    setCreatingUnderFolderId(parentId);
    setNewSubfolderName("");
  };

  const cancelInlineSubfolder = () => {
    if (creatingBusy) return;
    setCreatingUnderFolderId(null);
    setNewSubfolderName("");
  };

  const commitInlineSubfolder = async () => {
    const name = newSubfolderName.trim();
    if (!name || !creatingUnderFolderId) {
      cancelInlineSubfolder();
      return;
    }
    try {
      setCreatingBusy(true);
      await onCreateSubfolder(creatingUnderFolderId, name);
    } finally {
      setCreatingBusy(false);
      setCreatingUnderFolderId(null);
      setNewSubfolderName("");
    }
  };

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0 || folder.documentCount > 0;
    const folderDocuments = documents.filter(
      (doc) => doc.folderId === folder.id
    );
    const isDragOver = dragOverFolder === folder.id;

    const ContextItems = (
      <>
        <ContextMenuItem
          disabled={folder.isSystemFolder}
          onClick={(e) => {
            e.stopPropagation?.();
            onCreateFileInFolder(folder.id);
          }}
        >
          <FilePlus className="h-3 w-3 mr-2" />
          New file
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation?.();
            onUploadInFolder(folder.id);
          }}
        >
          <UploadIcon className="h-3 w-3 mr-2" />
          Upload file…
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation?.();
            beginInlineSubfolder(folder.id);
          }}
        >
          <FolderPlus className="h-3 w-3 mr-2" />
          New subfolder…
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation?.();
            onFolderEdit(folder);
          }}
        >
          <Edit2 className="h-3 w-3 mr-2" />
          Edit folder
        </ContextMenuItem>

        {!folder.isSystemFolder && (
          <ContextMenuItem
            className="text-red-600"
            disabled={
              (folder.documentCount ?? 0) > 0 || folder.children.length > 0
            }
            onClick={(e) => {
              e.stopPropagation?.();
              onFolderDelete(folder.id);
            }}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete folder
          </ContextMenuItem>
        )}
      </>
    );

    return (
      <Fragment key={folder.id}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`grid grid-cols-12 gap-4 px-6 py-3 transition-colors cursor-pointer group items-center border-b border-gray-100 ${
                isSelected ? "bg-gray-50" : "hover:bg-gray-50/50"
              } ${isDragOver ? "bg-blue-50 border-blue-300" : ""}`}
              style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}
              onClick={() => {
                if (hasChildren) onFolderToggle(folder.id);
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
                    if (hasChildren) onFolderToggle(folder.id);
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
                  {folder.permissionsExplicit &&
                    folder.permissionsExplicit.length > 0 && (
                      <span className="ml-2 text-[10px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">
                        locked
                      </span>
                    )}
                  {isDragOver && draggedItem && (
                    <span className="ml-2 text-xs text-blue-600">
                      Drop here
                    </span>
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
                  {folder.totalSize > 0
                    ? formatFileSize(folder.totalSize)
                    : "—"}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-sm text-gray-500">
                  {formatDate(folder.lastModifiedAt || folder.updatedAt)}
                </span>
              </div>

              <div className="col-span-1 flex justify-end">
                <AccessMini
                  entity="folder"
                  entityId={folder.id}
                  title={`Access – ${folder.name}`}
                  className="ml-2"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      aria-label="Folder actions"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      disabled={folder.isSystemFolder}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFileInFolder(folder.id);
                      }}
                    >
                      <FilePlus className="h-3 w-3 mr-2" />
                      New file
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onUploadInFolder(folder.id);
                      }}
                    >
                      <UploadIcon className="h-3 w-3 mr-2" />
                      Upload file…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        beginInlineSubfolder(folder.id);
                      }}
                    >
                      <FolderPlus className="h-3 w-3 mr-2" />
                      New subfolder…
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onFolderEdit(folder);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit folder
                    </DropdownMenuItem>

                    {!folder.isSystemFolder && (
                      <DropdownMenuItem
                        className="text-red-600"
                        disabled={
                          (folder.documentCount ?? 0) > 0 ||
                          folder.children.length > 0
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onFolderDelete(folder.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete folder
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-56">
            {ContextItems}
          </ContextMenuContent>
        </ContextMenu>

        {/* Inline "new subfolder" row */}
        {isExpanded && creatingUnderFolderId === folder.id && (
          <div
            className="grid grid-cols-12 gap-4 px-6 py-2 border-b border-gray-50 bg-gray-50/60"
            style={{ paddingLeft: `${3 + level * 1.5}rem` }}
          >
            <div className="col-span-5 flex items-center gap-3">
              <div className="h-4 w-4" />
              <Folder className="h-4 w-4 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                value={newSubfolderName}
                disabled={creatingBusy}
                onChange={(e) => setNewSubfolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void commitInlineSubfolder();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelInlineSubfolder();
                  }
                }}
                onBlur={() => {
                  // Save on blur if something was typed, otherwise cancel
                  if (newSubfolderName.trim().length > 0) {
                    void commitInlineSubfolder();
                  } else {
                    cancelInlineSubfolder();
                  }
                }}
                placeholder="New folder name…"
                className="text-sm px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
              />
              {creatingBusy && (
                <span className="text-xs text-gray-500">Creating…</span>
              )}
            </div>
            <div className="col-span-2" />
            <div className="col-span-2" />
            <div className="col-span-2" />
            <div className="col-span-1 flex justify-end">
              {!creatingBusy && (
                <button
                  title="Cancel"
                  onMouseDown={(e) => {
                    // mousedown so it fires before input blur
                    e.preventDefault();
                    cancelInlineSubfolder();
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {isExpanded &&
          documents
            .filter((doc) => doc.folderId === folder.id)
            .map((doc) => (
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
                  <div className="h-4 w-4" />
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
                    <AccessMini
                      entity="document"
                      entityId={doc.id}
                      title={`Access – ${doc.fileName}`}
                      className="ml-2"
                    />

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

                    <button
                      onClick={() =>
                        router.push(`/dashboard/documents/${doc.id}`)
                      }
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="View"
                      aria-label="View"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
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
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          Preview
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onDocumentMove(doc)}>
                          <Move className="h-3 w-3 mr-2" />
                          Move to Folder
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => onDocumentLink(doc)}>
                          <Building2 className="h-3 w-3 mr-2" />
                          Link Companies
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => onDocumentDelete(doc.id)}
                          className="text-red-600"
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

        {/* Children */}
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

      {/* Header */}
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
