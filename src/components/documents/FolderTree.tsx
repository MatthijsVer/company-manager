// components/documents/FolderTree.tsx
"use client";

import { Fragment } from "react";
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
  FolderPlus,
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
  onDocumentDownload: (document: Document) => void;
  onDocumentMove: (document: Document) => void;
  onDocumentLink: (document: Document) => void;
  onDocumentDelete: (documentId: string) => void;
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
  onDocumentDownload,
  onDocumentMove,
  onDocumentLink,
  onDocumentDelete,
}: FolderTreeProps) {
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

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children.length > 0 || folder.documentCount > 0;
    const folderDocuments = documents.filter(
      (doc) => doc.folderId === folder.id
    );

    return (
      <Fragment key={folder.id}>
        {/* Folder Row */}
        <div
          className={`grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-100 ${
            isSelected ? "bg-gray-50" : ""
          }`}
          style={{ paddingLeft: `${1.5 + level * 1.5}rem` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          <div className="col-span-5 flex items-center gap-3">
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
          isSelected &&
          folderDocuments.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer group items-center border-b border-gray-50"
              style={{
                backgroundColor: "oklch(0.985 0 0)",
                paddingLeft: `${3 + level * 1.5}rem`,
              }}
            >
              <div className="col-span-5 flex items-center gap-3">
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
      className="bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
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
