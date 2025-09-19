// components/documents/DocumentsHeader.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Filter, Upload, FolderPlus, Check } from "lucide-react";

interface DocumentsHeaderProps {
  totalDocuments: number;
  totalStorage: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showTemplatesOnly: boolean;
  onTemplatesFilterChange: (show: boolean) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export function DocumentsHeader({
  totalDocuments,
  totalStorage,
  searchQuery,
  onSearchChange,
  showTemplatesOnly,
  onTemplatesFilterChange,
  onCreateFolder,
  onUpload,
}: DocumentsHeaderProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex border-b px-6 py-2 items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          {totalDocuments} files • {formatFileSize(totalStorage)} used
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A] focus:border-[#FF6B4A] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10">
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {showTemplatesOnly && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#FF6B4A] text-white text-xs rounded-full">
                  1
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 mb-2">TYPE</p>
              <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded cursor-pointer">
                <Checkbox
                  checked={showTemplatesOnly}
                  onCheckedChange={(checked) =>
                    onTemplatesFilterChange(checked as boolean)
                  }
                />
                <span className="text-sm">Templates only</span>
              </label>
            </div>
            {showTemplatesOnly && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => onTemplatesFilterChange(false)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                >
                  Clear filters
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions */}
        <Button onClick={onCreateFolder} variant="outline" className="h-10">
          <FolderPlus className="w-4 h-4 mr-2" />
          New Folder
        </Button>

        <Button
          onClick={onUpload}
          className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white h-10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}
